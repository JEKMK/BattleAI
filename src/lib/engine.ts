import {
  type GameState,
  type Fighter,
  type FighterAction,
  type LogEntry,
  type BattleConfig,
  type Direction,
  DEFAULT_CONFIG,
} from "./types";

export function createInitialState(config: BattleConfig = DEFAULT_CONFIG): GameState {
  // Spawn at different Y positions to force 2D movement
  const yRange = Math.max(1, config.arenaHeight - 2);
  const minSeparation = Math.min(2, yRange); // Can't require 2 apart if arena is too small
  const redY = 1 + Math.floor(Math.random() * yRange);
  let blueY = 1 + Math.floor(Math.random() * yRange);
  let attempts = 0;
  while (Math.abs(blueY - redY) < minSeparation && attempts < 20) {
    blueY = 1 + Math.floor(Math.random() * yRange);
    attempts++;
  }

  const playerHp = config.playerHp ?? config.maxHp;
  const red: Fighter = {
    id: "red",
    name: "",
    faction: "anthropic",
    x: 1,
    y: redY,
    hp: playerHp,
    maxHp: playerHp,
    facing: "right",
    cooldowns: { dash: 0, dodge: 0, heavy: 0, parry: 0 },
    charging: null,
    isInvulnerable: false,
    isBlocking: false,
    isParrying: false,
    isStunned: false,
    damageMultiplier: 1,
  };

  const blue: Fighter = {
    id: "blue",
    name: "",
    faction: "openai",
    x: config.arenaWidth - 2,
    y: blueY,
    hp: config.maxHp,
    maxHp: config.maxHp,
    facing: "left",
    cooldowns: { dash: 0, dodge: 0, heavy: 0, parry: 0 },
    charging: null,
    isInvulnerable: false,
    isBlocking: false,
    isParrying: false,
    isStunned: false,
    damageMultiplier: 1,
  };

  return {
    tick: 0,
    arena: { width: config.arenaWidth, height: config.arenaHeight },
    bounds: { minX: 0, minY: 0, maxX: config.arenaWidth - 1, maxY: config.arenaHeight - 1 },
    fighters: [red, blue],
    status: "fighting",
    winner: null,
    log: [],
  };
}

function distance(a: Fighter, b: Fighter): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function applyMove(fighter: Fighter, dir: Direction, bounds: GameState["bounds"]): void {
  if (fighter.isStunned) return;
  switch (dir) {
    case "up": fighter.y = Math.max(bounds.minY, fighter.y - 1); break;
    case "down": fighter.y = Math.min(bounds.maxY, fighter.y + 1); break;
    case "left": fighter.x = Math.max(bounds.minX, fighter.x - 1); break;
    case "right": fighter.x = Math.min(bounds.maxX, fighter.x + 1); break;
  }
  if (dir !== "none") {
    fighter.facing = dir;
  }
}

/** Shoot accuracy drops with distance */
function shootHits(dist: number): boolean {
  // dist 1: 100%, dist 2: 90%, dist 3: 75%, dist 4: 55%, dist 5: 35%
  const accuracy = Math.max(0.2, 1.0 - (dist - 1) * 0.18);
  return Math.random() < accuracy;
}

/** Clamp fighter position within bounds */
function clampToBounds(fighter: Fighter, bounds: GameState["bounds"]): void {
  fighter.x = Math.max(bounds.minX, Math.min(bounds.maxX, fighter.x));
  fighter.y = Math.max(bounds.minY, Math.min(bounds.maxY, fighter.y));
}

function logWithPos(
  tick: number,
  fighter: "red" | "blue",
  type: LogEntry["type"],
  message: string,
  f: Fighter,
): LogEntry {
  return { tick, fighter, type, message, x: f.x, y: f.y };
}

export function resolveTick(
  state: GameState,
  redAction: FighterAction,
  blueAction: FighterAction,
  redFirst: boolean = true,
  allowedActions?: string[],
): GameState {
  // Filter disallowed actions to "none"
  if (allowedActions) {
    if (!allowedActions.includes(redAction.action)) redAction = { ...redAction, action: "none" };
    if (!allowedActions.includes(blueAction.action)) blueAction = { ...blueAction, action: "none" };
  }

  const next: GameState = JSON.parse(JSON.stringify(state));
  next.tick++;
  const [red, blue] = next.fighters;
  const newLogs: LogEntry[] = [];

  // Arena shrink — every 15 ticks, bounds close in by 1 on each side
  // Starts at tick 30 to give time to warm up
  if (next.tick >= 30 && next.tick % 15 === 0) {
    const b = next.bounds;
    const canShrinkX = b.maxX - b.minX > 3; // minimum 4 wide
    const canShrinkY = b.maxY - b.minY > 2; // minimum 3 tall
    if (canShrinkX || canShrinkY) {
      if (canShrinkX) { b.minX++; b.maxX--; }
      if (canShrinkY) { b.minY++; b.maxY--; }
      newLogs.push({ tick: next.tick, fighter: "red", type: "system", message: `Firewall perimeter shrinking — safe zone now ${b.maxX - b.minX + 1}x${b.maxY - b.minY + 1}` });
    }
  }

  // Damage fighters outside bounds (1 ICE per tick)
  for (const [f, fId] of [[red, "red"], [blue, "blue"]] as [Fighter, "red" | "blue"][]) {
    if (f.x < next.bounds.minX || f.x > next.bounds.maxX || f.y < next.bounds.minY || f.y > next.bounds.maxY) {
      f.hp = Math.max(0, f.hp - 1);
      newLogs.push(logWithPos(next.tick, fId, "hit", `Firewall burn -1 ICE ${f.hp > 0 ? `[${f.hp}/${f.maxHp}]` : "— critical!"}`, f));
      clampToBounds(f, next.bounds);
    }
  }

  // Reset per-tick states
  red.isInvulnerable = false;
  blue.isInvulnerable = false;
  red.isBlocking = false;
  blue.isBlocking = false;
  red.isParrying = false;
  blue.isParrying = false;

  // Reset stun (lasts 1 tick)
  const redWasStunned = red.isStunned;
  const blueWasStunned = blue.isStunned;
  red.isStunned = false;
  blue.isStunned = false;

  // Tick down cooldowns
  for (const f of [red, blue]) {
    for (const key of Object.keys(f.cooldowns) as (keyof Fighter["cooldowns"])[]) {
      if (f.cooldowns[key] > 0) f.cooldowns[key]--;
    }
  }

  // If stunned this tick, skip all actions
  if (redWasStunned) {
    newLogs.push(logWithPos(next.tick, "red", "stun", "Systems locked — recovering from feedback", red));
  }
  if (blueWasStunned) {
    newLogs.push(logWithPos(next.tick, "blue", "stun", "Systems locked — recovering from feedback", blue));
  }

  // Phase 1: Movement (stunned fighters can't move)
  if (!redWasStunned) applyMove(red, redAction.move, next.bounds);
  if (!blueWasStunned) applyMove(blue, blueAction.move, next.bounds);

  if (redAction.move !== "none" && !redWasStunned) {
    newLogs.push(logWithPos(next.tick, "red", "move", redAction.move, red));
  }
  if (blueAction.move !== "none" && !blueWasStunned) {
    newLogs.push(logWithPos(next.tick, "blue", "move", blueAction.move, blue));
  }

  // Phase 2: Defensive actions first (block, dodge, parry)
  const applyDefense = (
    actor: Fighter,
    actorId: "red" | "blue",
    action: FighterAction,
    wasStunned: boolean,
  ) => {
    if (wasStunned) return;

    if (action.action === "block") {
      actor.isBlocking = true;
      newLogs.push(logWithPos(next.tick, actorId, "block", "Shield raised — firewall hardened", actor));
    } else if (action.action === "dodge" && actor.cooldowns.dodge <= 0) {
      actor.isInvulnerable = true;
      actor.cooldowns.dodge = 4;
      newLogs.push(logWithPos(next.tick, actorId, "dodge", "Phase shift — quantum state active", actor));
    } else if (action.action === "parry" && actor.cooldowns.parry <= 0) {
      actor.isParrying = true;
      actor.cooldowns.parry = 5;
      newLogs.push(logWithPos(next.tick, actorId, "parry", "Black ICE deployed — counter-intrusion armed", actor));
    }
  };

  applyDefense(red, "red", redAction, redWasStunned);
  applyDefense(blue, "blue", blueAction, blueWasStunned);

  // Phase 3: Offensive actions (with parry check)
  const resolveAttack = (
    actor: Fighter,
    actorId: "red" | "blue",
    action: FighterAction,
    target: Fighter,
    targetId: "red" | "blue",
    wasStunned: boolean,
    moved: boolean,
  ) => {
    if (wasStunned) return;
    const dist = distance(actor, target);
    // Moving + attacking = 50% damage. Standing still = full damage.
    const mobilityPenalty = moved ? 0.5 : 1.0;
    const multi = actor.damageMultiplier * mobilityPenalty;
    const hpTag = (f: Fighter) => `[${f.hp}/${f.maxHp}]`;
    const movingTag = moved ? " (moving)" : "";

    switch (action.action) {
      case "punch": {
        if (dist <= 2) {
          if (target.isParrying && dist <= 2) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", `BLACK ICE triggers! Burn intercepted`, target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", `Neural feedback — stunned 1 cycle`, actor));
            return;
          }

          let dmg = Math.max(1, Math.floor(2 * multi));
          if (target.isBlocking) {
            dmg = Math.max(1, Math.floor(dmg / 2));
            newLogs.push(logWithPos(next.tick, actorId, "attack", `Burn hit shield -${dmg} ICE${movingTag} ${hpTag(target)}`, target));
          } else if (target.isInvulnerable) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", `Burn phased through — target shifted`, actor));
          } else {
            const comboTag = actor.damageMultiplier > 1 ? "COMBO " : "";
            newLogs.push(logWithPos(next.tick, actorId, "hit", `${comboTag}Burn -${dmg} ICE${movingTag} ${hpTag(target)}`, target));
          }
          target.hp = Math.max(0, target.hp - dmg);
          actor.damageMultiplier = 1;
        } else {
          newLogs.push(logWithPos(next.tick, actorId, "miss", `Burn failed — target at dist ${dist}`, actor));
        }
        break;
      }

      case "shoot": {
        if (dist <= 5 && dist > 0) {
          if (target.isParrying && dist <= 3) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", `BLACK ICE reflects spike at dist ${dist}`, target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", `Signal reflected — stunned 1 cycle`, actor));
            return;
          }

          const acc = Math.max(20, Math.round((1.0 - (dist - 1) * 0.18) * 100));
          if (!shootHits(dist)) {
            newLogs.push(logWithPos(next.tick, actorId, "miss", `Spike scattered at dist ${dist} — ${acc}% lock, no contact`, actor));
            break;
          }

          let dmg = Math.max(1, Math.floor(1 * multi));
          if (target.isBlocking) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", `Spike deflected by firewall at dist ${dist}`, target));
          } else if (target.isInvulnerable) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", `Spike passes through ghost at dist ${dist}`, actor));
          } else {
            const comboTag = actor.damageMultiplier > 1 ? "COMBO " : "";
            newLogs.push(logWithPos(next.tick, actorId, "hit", `${comboTag}Spike -${dmg} ICE at dist ${dist} (${acc}% lock)${movingTag} ${hpTag(target)}`, target));
          }
          target.hp = Math.max(0, target.hp - dmg);
          actor.damageMultiplier = 1;
        } else {
          newLogs.push(logWithPos(next.tick, actorId, "miss", `Spike dissipates — target at dist ${dist}, max range 5`, actor));
        }
        break;
      }

      case "heavy": {
        if (actor.cooldowns.heavy > 0) break;
        if (dist <= 2) {
          if (target.isParrying) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", `BLACK ICE perfect counter on Hammer!`, target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", `Hammer reversed — stunned 1 cycle`, actor));
            return;
          }

          let dmg = Math.max(1, Math.floor(3 * multi));
          if (target.isBlocking) {
            dmg = Math.max(1, Math.floor(dmg * 0.6));
            newLogs.push(logWithPos(next.tick, actorId, "hit", `Hammer cracks shield -${dmg} ICE${movingTag} ${hpTag(target)}`, target));
          } else if (target.isInvulnerable) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", `Hammer slams empty space — target phased`, actor));
          } else {
            const comboTag = actor.damageMultiplier > 1 ? "MEGA COMBO " : "";
            newLogs.push(logWithPos(next.tick, actorId, "hit", `${comboTag}Hammer -${dmg} ICE!${movingTag} ${hpTag(target)}`, target));
          }
          target.hp = Math.max(0, target.hp - dmg);
          actor.damageMultiplier = 1;
          actor.cooldowns.heavy = 3;
        } else {
          newLogs.push(logWithPos(next.tick, actorId, "miss", `Hammer whiffs — target at dist ${dist}`, actor));
        }
        break;
      }
    }
  };

  const redMoved = redAction.move !== "none" && !redWasStunned;
  const blueMoved = blueAction.move !== "none" && !blueWasStunned;

  // Faster LLM attacks first — if they kill, the other doesn't get to attack
  if (redFirst) {
    resolveAttack(red, "red", redAction, blue, "blue", redWasStunned, redMoved);
    if (blue.hp > 0) resolveAttack(blue, "blue", blueAction, red, "red", blueWasStunned, blueMoved);
  } else {
    resolveAttack(blue, "blue", blueAction, red, "red", blueWasStunned, blueMoved);
    if (red.hp > 0) resolveAttack(red, "red", redAction, blue, "blue", redWasStunned, redMoved);
  }

  // Parry whiff — if you parried but nobody attacked you
  if (red.isParrying && !blue.isStunned && !["punch", "shoot", "heavy"].includes(blueAction.action)) {
    newLogs.push(logWithPos(next.tick, "red", "miss", "Black ICE fizzles — no intrusion detected", red));
  }
  if (blue.isParrying && !red.isStunned && !["punch", "shoot", "heavy"].includes(redAction.action)) {
    newLogs.push(logWithPos(next.tick, "blue", "miss", "Black ICE fizzles — no intrusion detected", blue));
  }

  // Check KO
  if (red.hp <= 0 || blue.hp <= 0) {
    if (red.hp <= 0 && blue.hp <= 0) {
      next.status = "ko";
      next.winner = "draw";
      newLogs.push(logWithPos(next.tick, "red", "ko", "Both constructs flatlined — mutual destruction", red));
    } else if (red.hp <= 0) {
      next.status = "ko";
      next.winner = "blue";
      newLogs.push(logWithPos(next.tick, "red", "ko", `FLATLINED — ICE breached, construct destroyed`, red));
    } else {
      next.status = "ko";
      next.winner = "red";
      newLogs.push(logWithPos(next.tick, "blue", "ko", `FLATLINED — ICE breached, construct destroyed`, blue));
    }
  }

  // Check timeout
  if (next.tick >= 120 && next.status === "fighting") {
    next.status = "timeout";
    if (red.hp > blue.hp) next.winner = "red";
    else if (blue.hp > red.hp) next.winner = "blue";
    else next.winner = "draw";
    newLogs.push({
      tick: next.tick,
      fighter: "red",
      type: "system",
      message: `Connection timeout — ${next.winner === "draw" ? "no victor, both constructs survive" : `${next.winner} construct holds superior ICE`}`,
    });
  }

  next.log = [...next.log, ...newLogs];
  return next;
}

export function buildTickInput(state: GameState, fighterId: "red" | "blue", allowedActions?: string[]): string {
  const me = state.fighters[fighterId === "red" ? 0 : 1];
  const enemy = state.fighters[fighterId === "red" ? 1 : 0];
  const recentLogs = state.log.slice(-10);

  const dist = Math.abs(me.x - enemy.x) + Math.abs(me.y - enemy.y);

  const input: Record<string, unknown> = {
    tick: state.tick,
    distance: dist,
    you: {
      x: me.x, y: me.y, hp: me.hp, maxHp: me.maxHp,
      facing: me.facing,
      cooldowns: me.cooldowns,
      isBlocking: me.isBlocking,
      isStunned: me.isStunned,
    },
    enemy: {
      x: enemy.x, y: enemy.y, hp: enemy.hp,
      facing: enemy.facing,
      isBlocking: enemy.isBlocking,
      isStunned: enemy.isStunned,
    },
    arena: state.arena,
    bounds: state.bounds,
    history: recentLogs,
  };

  if (allowedActions) {
    input.availableActions = allowedActions;
  }

  return JSON.stringify(input);
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  punch: "burn/punch (range 2, 2dmg)",
  shoot: "spike/shoot (range 1-5, 1dmg, accuracy drops with distance)",
  heavy: "hammer/heavy (range 2, 3dmg, cooldown 3)",
  block: "shield/block (halves melee, blocks spikes)",
  dodge: "ghost/dodge (invulnerable 1 tick, cooldown 4)",
  parry: "black_ice/parry (counter: if enemy attacks this tick → stun + 2x next hit, cooldown 5)",
};

const ALL_ACTIONS = ["punch", "shoot", "heavy", "block", "dodge", "parry"];

export function buildSystemRules(allowedActions?: string[]): string {
  const actions = allowedActions ?? ALL_ACTIONS;
  const actionDescs = actions
    .filter((a) => ACTION_DESCRIPTIONS[a])
    .map((a) => ACTION_DESCRIPTIONS[a])
    .join(", ");

  let rules = `Arena combat. Each tick you choose 1 move + 1 action.

ACTIONS: ${actionDescs}.

MOVES: north/up, south/down, west/left, east/right, hold/none.

Moving + attacking = half damage. Standing still + attacking = full damage.`;

  if (actions.includes("parry") || actions.includes("dodge")) {
    rules += `\nSTUNNED = skip next tick.`;
  }

  if (actions.includes("heavy") || actions.includes("dodge") || actions.includes("parry")) {
    rules += `\nSome actions have cooldowns — check your cooldowns before choosing.`;
  }

  rules += `

Input: you receive tick state as JSON with distance, positions, cooldowns, and recent history.

Respond with one JSON object only:
{"move":"up","action":"punch"}`;

  return rules;
}

/** Full rules for backwards compatibility */
export const SYSTEM_RULES = buildSystemRules();
