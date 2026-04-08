import { generateText, gateway } from "ai";
import {
  type Faction,
  type FighterAction,
  type GameState,
  FACTION_META,
  BOT_PROMPTS,
  DEFAULT_CONFIG,
} from "@/lib/types";
import { createInitialState, resolveTick, buildTickInput, buildSystemRules } from "@/lib/engine";

// Per-model pricing (input/output per million tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "anthropic/claude-haiku-4.5": { input: 0.80, output: 4.00 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.60 },
};

interface UsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;
  perFaction: Record<string, { inputTokens: number; outputTokens: number; calls: number }>;
}

interface ActionRecord {
  tick: number;
  fighter: "red" | "blue";
  rawResponse: string;
  parsed: FighterAction;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

// Lore aliases → internal action names
const ACTION_ALIASES: Record<string, string> = {
  burn: "punch", spike: "shoot", hammer: "heavy",
  shield: "block", ghost: "dodge", "black_ice": "parry", "blackice": "parry", "b.ice": "parry",
  // originals pass through
  punch: "punch", shoot: "shoot", heavy: "heavy",
  block: "block", dodge: "dodge", parry: "parry", none: "none",
};

const MOVE_ALIASES: Record<string, string> = {
  north: "up", south: "down", west: "left", east: "right", hold: "none",
  up: "up", down: "down", left: "left", right: "right", none: "none",
};

function parseAction(text: string): FighterAction {
  try {
    const match = text.match(/\{[^}]+\}/);
    if (!match) return { move: "none", action: "none" };
    const parsed = JSON.parse(match[0]);
    const move = MOVE_ALIASES[(parsed.move || "none").toLowerCase()] || "none";
    const action = ACTION_ALIASES[(parsed.action || "none").toLowerCase()] || "none";
    return {
      move: move as FighterAction["move"],
      action: action as FighterAction["action"],
    };
  } catch {
    return { move: "none", action: "none" };
  }
}

async function callLLM(
  systemPrompt: string,
  model: string,
  tickInput: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const result = await generateText({
    model: gateway(model),
    system: systemPrompt,
    prompt: tickInput,
    maxOutputTokens: 150,
    temperature: 0.5,
  });

  const inputTokens = (result.usage as { promptTokens?: number })?.promptTokens ?? result.usage?.totalTokens ?? 0;
  const outputTokens = (result.usage as { completionTokens?: number })?.completionTokens ?? 0;

  return { text: result.text, inputTokens, outputTokens };
}

async function getAIAction(
  systemPrompt: string,
  faction: Faction,
  tickInput: string,
  usage: UsageStats,
  tick: number,
  fighterId: "red" | "blue",
  actionLog: ActionRecord[],
  rules: string,
): Promise<{ action: FighterAction; latencyMs: number }> {
  const model = FACTION_META[faction].model;
  const fullSystem = `${systemPrompt}\n\n${rules}`;
  const start = Date.now();

  try {
    let result = await callLLM(fullSystem, model, tickInput);

    // Retry once if response is empty or too short (Gemini issue)
    if (!result.text || result.text.trim().length < 10) {
      console.warn(`[${fighterId}] ${model} empty/short response: "${result.text}" — retrying`);
      result = await callLLM(fullSystem, model, tickInput);
    }

    const latencyMs = Date.now() - start;

    usage.totalInputTokens += result.inputTokens;
    usage.totalOutputTokens += result.outputTokens;
    usage.totalCalls++;

    if (!usage.perFaction[model]) {
      usage.perFaction[model] = { inputTokens: 0, outputTokens: 0, calls: 0 };
    }
    usage.perFaction[model].inputTokens += result.inputTokens;
    usage.perFaction[model].outputTokens += result.outputTokens;
    usage.perFaction[model].calls++;

    const parsed = parseAction(result.text);

    // Log warning if still broken after retry
    if (parsed.move === "none" && parsed.action === "none" && result.text.trim().length > 0) {
      console.warn(`[${fighterId}] ${model} unparseable: "${result.text.trim().slice(0, 100)}"`);
    }

    actionLog.push({
      tick,
      fighter: fighterId,
      rawResponse: result.text.trim(),
      parsed,
      latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    return { action: parsed, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;
    console.error(`AI error (${model}):`, error);
    actionLog.push({
      tick,
      fighter: fighterId,
      rawResponse: `ERROR: ${error instanceof Error ? error.message : "unknown"}`,
      parsed: { move: "none", action: "none" },
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
    });
    return { action: { move: "none", action: "none" }, latencyMs };
  }
}

function calculateCost(usage: UsageStats): { perModel: Record<string, number>; total: number } {
  const perModel: Record<string, number> = {};
  let total = 0;
  for (const [model, stats] of Object.entries(usage.perFaction)) {
    const pricing = MODEL_PRICING[model] || { input: 0.50, output: 1.50 };
    const cost = (stats.inputTokens / 1_000_000) * pricing.input +
                 (stats.outputTokens / 1_000_000) * pricing.output;
    perModel[model] = cost;
    total += cost;
  }
  return { perModel, total };
}

interface FighterStats {
  moves: Record<string, number>;
  actions: Record<string, number>;
  avgLatency: number;
  totalLatency: number;
  count: number;
  // Combat stats
  totalDmgDealt: number;
  totalDmgBlocked: number;
  totalDmgDodged: number;
  shotsHit: number;
  shotsFired: number;
  shotAccuracy: number;
  punchesHit: number;
  punchesFired: number;
  heavyHit: number;
  heavyFired: number;
  parrySuccess: number;
  parryAttempts: number;
}

function buildAnalytics(actionLog: ActionRecord[], gameLog: GameState["log"]) {
  const byFighter: Record<string, FighterStats> = {};

  for (const record of actionLog) {
    if (!byFighter[record.fighter]) {
      byFighter[record.fighter] = {
        moves: {}, actions: {}, avgLatency: 0, totalLatency: 0, count: 0,
        totalDmgDealt: 0, totalDmgBlocked: 0, totalDmgDodged: 0,
        shotsHit: 0, shotsFired: 0, shotAccuracy: 0,
        punchesHit: 0, punchesFired: 0,
        heavyHit: 0, heavyFired: 0,
        parrySuccess: 0, parryAttempts: 0,
      };
    }
    const f = byFighter[record.fighter];
    f.moves[record.parsed.move] = (f.moves[record.parsed.move] || 0) + 1;
    f.actions[record.parsed.action] = (f.actions[record.parsed.action] || 0) + 1;
    f.totalLatency += record.latencyMs;
    f.count++;
  }

  // Parse combat log for damage stats
  for (const log of gameLog) {
    const attacker = log.fighter;
    const f = byFighter[attacker];
    if (!f) continue;

    // Extract damage from messages like "-2", "COMBO -4!", "HEAVY -3!", "BLOCKED -1"
    const dmgMatch = log.message.match(/-(\d+)/);
    const dmg = dmgMatch ? parseInt(dmgMatch[1]) : 0;

    if (log.type === "hit") {
      f.totalDmgDealt += dmg;
      if (log.message.includes("HEAVY") || log.message.includes("MEGA")) f.heavyHit++;
      else if (log.message.includes("COMBO") || dmg >= 2) f.punchesHit++;
      else f.shotsHit++;
    }

    if (log.type === "attack" && log.message.includes("BLOCKED")) {
      // Attacker's hit was blocked — the defender blocked
      const defender = attacker === "red" ? "blue" : "red";
      if (byFighter[defender]) byFighter[defender].totalDmgBlocked += dmg;
      f.totalDmgDealt += dmg; // still dealt some damage through block
    }

    if (log.type === "miss") {
      if (log.message === "MISS!") {
        // Shot missed due to accuracy
        f.shotsFired++;
      } else if (log.message.includes("DODGED") || log.message.includes("MISS!")) {
        const defender = attacker === "red" ? "blue" : "red";
        if (byFighter[defender]) byFighter[defender].totalDmgDodged++;
      }
    }

    if (log.type === "parry") {
      if (log.message.includes("SUCCESS") || log.message.includes("DEFLECT") || log.message.includes("PERFECT")) {
        f.parrySuccess++;
      }
      if (log.message === "PARRY!") f.parryAttempts++;
    }
  }

  // Count shots/punches/heavy fired from action log
  for (const record of actionLog) {
    const f = byFighter[record.fighter];
    if (!f) continue;
    if (record.parsed.action === "shoot") f.shotsFired++;
    if (record.parsed.action === "punch") f.punchesFired++;
    if (record.parsed.action === "heavy") f.heavyFired++;
    if (record.parsed.action === "parry") f.parryAttempts++;
  }

  for (const f of Object.values(byFighter)) {
    f.avgLatency = Math.round(f.totalLatency / Math.max(1, f.count));
    f.shotAccuracy = f.shotsFired > 0 ? Math.round((f.shotsHit / f.shotsFired) * 100) : 0;
  }

  return byFighter;
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    playerPrompt,
    playerFaction,
    botType = "balanced",
    botFaction = "openai",
    // Gauntlet overrides
    botPrompt: customBotPrompt,
    botName: customBotName,
    botHp: customBotHp,
    // Level overrides
    allowedActions: levelAllowedActions,
    arenaWidth: levelArenaWidth,
    arenaHeight: levelArenaHeight,
    playerHp: levelPlayerHp,
  }: {
    playerPrompt: string;
    playerFaction: Faction;
    botType: string;
    botFaction: Faction;
    botPrompt?: string;
    botName?: string;
    botHp?: number;
    allowedActions?: string[];
    arenaWidth?: number;
    arenaHeight?: number;
    playerHp?: number;
  } = body;

  if (!playerPrompt || !playerFaction) {
    return Response.json({ error: "Missing playerPrompt or playerFaction" }, { status: 400 });
  }

  const bot = BOT_PROMPTS[botType] || BOT_PROMPTS.balanced;
  const actualBotPrompt = customBotPrompt || bot.prompt;
  const actualBotName = customBotName || bot.name;

  const config = {
    ...DEFAULT_CONFIG,
    ...(levelArenaWidth && { arenaWidth: levelArenaWidth }),
    ...(levelArenaHeight && { arenaHeight: levelArenaHeight }),
    ...(levelPlayerHp && { playerHp: levelPlayerHp }),
    ...(levelAllowedActions && { allowedActions: levelAllowedActions }),
  };

  let state = createInitialState(config);

  state.fighters[0].name = "PLAYER";
  state.fighters[0].faction = playerFaction;
  state.fighters[1].name = actualBotName;
  state.fighters[1].faction = botFaction;

  if (customBotHp) {
    state.fighters[1].hp = customBotHp;
    state.fighters[1].maxHp = customBotHp;
  }

  const systemRules = buildSystemRules(levelAllowedActions);

  const usage: UsageStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCalls: 0,
    perFaction: {},
  };

  const actionLog: ActionRecord[] = [];

  console.log(JSON.stringify({
    event: "BATTLE_START",
    timestamp: new Date().toISOString(),
    playerFaction,
    botFaction,
    botName: actualBotName,
    playerPromptLength: playerPrompt.length,
    arenaSize: `${levelArenaWidth || 10}x${levelArenaHeight || 8}`,
    allowedActions: levelAllowedActions || "all",
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(state) + "\n"));

      while (state.status === "fighting") {
        const redInput = buildTickInput(state, "red", levelAllowedActions);
        const blueInput = buildTickInput(state, "blue", levelAllowedActions);

        const [redResult, blueResult] = await Promise.all([
          getAIAction(playerPrompt, playerFaction, redInput, usage, state.tick + 1, "red", actionLog, systemRules),
          getAIAction(actualBotPrompt, botFaction, blueInput, usage, state.tick + 1, "blue", actionLog, systemRules),
        ]);

        const redFirst = redResult.latencyMs <= blueResult.latencyMs;
        state = resolveTick(state, redResult.action, blueResult.action, redFirst, levelAllowedActions);

        const tickDebug = {
          ...state,
          _debug: {
            redAction: redResult.action,
            blueAction: blueResult.action,
            redLatency: redResult.latencyMs,
            blueLatency: blueResult.latencyMs,
            priority: redFirst ? "red" : "blue",
          },
        };

        controller.enqueue(encoder.encode(JSON.stringify(tickDebug) + "\n"));

        await new Promise((r) => setTimeout(r, 100));
      }

      // Send analytics
      const costs = calculateCost(usage);
      const analytics = buildAnalytics(actionLog, state.log);

      const statsLine = JSON.stringify({
        _type: "usage",
        totalCalls: usage.totalCalls,
        totalInputTokens: usage.totalInputTokens,
        totalOutputTokens: usage.totalOutputTokens,
        totalTokens: usage.totalInputTokens + usage.totalOutputTokens,
        costUSD: costs.total,
        perModel: Object.entries(usage.perFaction).map(([model, stats]) => ({
          model,
          calls: stats.calls,
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          costUSD: costs.perModel[model] || 0,
        })),
        analytics: {
          red: analytics.red,
          blue: analytics.blue,
        },
        actionLog,
      });
      controller.enqueue(encoder.encode(statsLine + "\n"));

      // Structured log — visible in Vercel function logs dashboard
      try {
        console.log(JSON.stringify({
          event: "BATTLE_COMPLETE",
          timestamp: new Date().toISOString(),
          winner: state.winner,
          ticks: state.tick,
          playerFaction,
          botFaction,
          botName: actualBotName,
          playerPromptLength: playerPrompt.length,
          costUSD: costs.total,
          totalTokens: usage.totalInputTokens + usage.totalOutputTokens,
          totalCalls: usage.totalCalls,
          arenaSize: `${levelArenaWidth || 10}x${levelArenaHeight || 8}`,
          playerHp: state.fighters[0].hp,
          botHp: state.fighters[1].hp,
        }));
      } catch (e) {
        console.error("Failed to save battle log:", e);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
