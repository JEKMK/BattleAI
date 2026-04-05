import { generateText, gateway } from "ai";
import {
  type Faction,
  type FighterAction,
  FACTION_META,
  BOT_PROMPTS,
  DEFAULT_CONFIG,
} from "@/lib/types";
import { createInitialState, resolveTick, buildTickInput, SYSTEM_RULES } from "@/lib/engine";

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

function parseAction(text: string): FighterAction {
  try {
    const match = text.match(/\{[^}]+\}/);
    if (!match) return { move: "none", action: "none" };
    const parsed = JSON.parse(match[0]);
    const validMoves = ["up", "down", "left", "right", "none"];
    const validActions = ["punch", "shoot", "heavy", "block", "dodge", "parry", "none"];
    return {
      move: validMoves.includes(parsed.move) ? parsed.move : "none",
      action: validActions.includes(parsed.action) ? parsed.action : "none",
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
): Promise<FighterAction> {
  const model = FACTION_META[faction].model;
  const fullSystem = `${systemPrompt}\n\n${SYSTEM_RULES}`;
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

    return parsed;
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
    return { move: "none", action: "none" };
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

function buildAnalytics(actionLog: ActionRecord[]) {
  const byFighter: Record<string, { moves: Record<string, number>; actions: Record<string, number>; avgLatency: number; totalLatency: number; count: number }> = {};

  for (const record of actionLog) {
    if (!byFighter[record.fighter]) {
      byFighter[record.fighter] = { moves: {}, actions: {}, avgLatency: 0, totalLatency: 0, count: 0 };
    }
    const f = byFighter[record.fighter];
    f.moves[record.parsed.move] = (f.moves[record.parsed.move] || 0) + 1;
    f.actions[record.parsed.action] = (f.actions[record.parsed.action] || 0) + 1;
    f.totalLatency += record.latencyMs;
    f.count++;
  }

  for (const f of Object.values(byFighter)) {
    f.avgLatency = Math.round(f.totalLatency / f.count);
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
  }: {
    playerPrompt: string;
    playerFaction: Faction;
    botType: string;
    botFaction: Faction;
  } = body;

  if (!playerPrompt || !playerFaction) {
    return Response.json({ error: "Missing playerPrompt or playerFaction" }, { status: 400 });
  }

  const bot = BOT_PROMPTS[botType] || BOT_PROMPTS.balanced;
  let state = createInitialState(DEFAULT_CONFIG);

  state.fighters[0].name = "PLAYER";
  state.fighters[0].faction = playerFaction;
  state.fighters[1].name = bot.name;
  state.fighters[1].faction = botFaction;

  const usage: UsageStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCalls: 0,
    perFaction: {},
  };

  const actionLog: ActionRecord[] = [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(state) + "\n"));

      while (state.status === "fighting") {
        const redInput = buildTickInput(state, "red");
        const blueInput = buildTickInput(state, "blue");

        const [redAction, blueAction] = await Promise.all([
          getAIAction(playerPrompt, playerFaction, redInput, usage, state.tick + 1, "red", actionLog),
          getAIAction(bot.prompt, botFaction, blueInput, usage, state.tick + 1, "blue", actionLog),
        ]);

        state = resolveTick(state, redAction, blueAction);

        // Send game state + debug info for this tick
        const tickDebug = {
          ...state,
          _debug: {
            redAction,
            blueAction,
            redRaw: actionLog.filter(a => a.tick === state.tick && a.fighter === "red")[0]?.rawResponse,
            blueRaw: actionLog.filter(a => a.tick === state.tick && a.fighter === "blue")[0]?.rawResponse,
            redLatency: actionLog.filter(a => a.tick === state.tick && a.fighter === "red")[0]?.latencyMs,
            blueLatency: actionLog.filter(a => a.tick === state.tick && a.fighter === "blue")[0]?.latencyMs,
          },
        };

        controller.enqueue(encoder.encode(JSON.stringify(tickDebug) + "\n"));

        await new Promise((r) => setTimeout(r, 100));
      }

      // Send analytics
      const costs = calculateCost(usage);
      const analytics = buildAnalytics(actionLog);

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
