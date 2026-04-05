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
  const redY = 1 + Math.floor(Math.random() * (config.arenaHeight - 2));
  let blueY = 1 + Math.floor(Math.random() * (config.arenaHeight - 2));
  // Ensure they're at least 2 apart vertically
  while (Math.abs(blueY - redY) < 2) {
    blueY = 1 + Math.floor(Math.random() * (config.arenaHeight - 2));
  }

  const red: Fighter = {
    id: "red",
    name: "",
    faction: "anthropic",
    x: 1,
    y: redY,
    hp: config.maxHp,
    maxHp: config.maxHp,
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
    fighters: [red, blue],
    status: "fighting",
    winner: null,
    log: [],
  };
}

function distance(a: Fighter, b: Fighter): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function applyMove(fighter: Fighter, dir: Direction, arena: { width: number; height: number }): void {
  if (fighter.isStunned) return; // stunned fighters can't move
  switch (dir) {
    case "up": fighter.y = Math.max(0, fighter.y - 1); break;
    case "down": fighter.y = Math.min(arena.height - 1, fighter.y + 1); break;
    case "left": fighter.x = Math.max(0, fighter.x - 1); break;
    case "right": fighter.x = Math.min(arena.width - 1, fighter.x + 1); break;
  }
  if (dir !== "none") {
    fighter.facing = dir;
  }
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
): GameState {
  const next: GameState = JSON.parse(JSON.stringify(state));
  next.tick++;
  const [red, blue] = next.fighters;
  const newLogs: LogEntry[] = [];

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
    newLogs.push(logWithPos(next.tick, "red", "stun", "STUNNED!", red));
  }
  if (blueWasStunned) {
    newLogs.push(logWithPos(next.tick, "blue", "stun", "STUNNED!", blue));
  }

  // Phase 1: Movement (stunned fighters can't move)
  if (!redWasStunned) applyMove(red, redAction.move, next.arena);
  if (!blueWasStunned) applyMove(blue, blueAction.move, next.arena);

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
      newLogs.push(logWithPos(next.tick, actorId, "block", "BLOCK", actor));
    } else if (action.action === "dodge" && actor.cooldowns.dodge <= 0) {
      actor.isInvulnerable = true;
      actor.cooldowns.dodge = 4;
      newLogs.push(logWithPos(next.tick, actorId, "dodge", "DODGE!", actor));
    } else if (action.action === "parry" && actor.cooldowns.parry <= 0) {
      actor.isParrying = true;
      actor.cooldowns.parry = 5;
      newLogs.push(logWithPos(next.tick, actorId, "parry", "PARRY!", actor));
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
  ) => {
    if (wasStunned) return;
    const dist = distance(actor, target);

    // Apply damage multiplier from successful parry
    const multi = actor.damageMultiplier;

    switch (action.action) {
      case "punch": {
        if (dist <= 2) {
          // Check if target is parrying — PARRY SUCCESS
          if (target.isParrying && dist <= 2) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", "PARRY SUCCESS!", target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", "STUNNED!", actor));
            return;
          }

          let dmg = Math.floor(2 * multi);
          if (target.isBlocking) {
            dmg = Math.max(1, Math.floor(dmg / 2));
            newLogs.push(logWithPos(next.tick, actorId, "attack", `BLOCKED -${dmg}`, target));
          } else if (target.isInvulnerable) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", "MISS!", actor));
          } else {
            const label = multi > 1 ? `COMBO -${dmg}!` : `-${dmg}`;
            newLogs.push(logWithPos(next.tick, actorId, "hit", label, target));
          }
          target.hp = Math.max(0, target.hp - dmg);
          actor.damageMultiplier = 1;
        } else {
          newLogs.push(logWithPos(next.tick, actorId, "miss", "TOO FAR", actor));
        }
        break;
      }

      case "shoot": {
        if (dist <= 5 && dist > 0) {
          if (target.isParrying && dist <= 3) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", "DEFLECT!", target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", "STUNNED!", actor));
            return;
          }

          let dmg = Math.floor(1 * multi);
          if (target.isBlocking) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", "BLOCKED", target));
          } else if (target.isInvulnerable) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", "DODGED", actor));
          } else {
            const label = multi > 1 ? `COMBO -${dmg}!` : `-${dmg}`;
            newLogs.push(logWithPos(next.tick, actorId, "hit", label, target));
          }
          target.hp = Math.max(0, target.hp - dmg);
          actor.damageMultiplier = 1;
        } else {
          newLogs.push(logWithPos(next.tick, actorId, "miss", "OUT OF RANGE", actor));
        }
        break;
      }

      case "heavy": {
        if (actor.cooldowns.heavy > 0) break; // on cooldown
        if (dist <= 2) {
          if (target.isParrying) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", "PERFECT PARRY!", target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", "STUNNED!", actor));
            return;
          }

          let dmg = Math.floor(3 * multi);
          if (target.isBlocking) {
            dmg = Math.max(1, Math.floor(dmg * 0.6));
            newLogs.push(logWithPos(next.tick, actorId, "hit", `BLOCKED -${dmg}`, target));
          } else if (target.isInvulnerable) {
            dmg = 0;
            newLogs.push(logWithPos(next.tick, actorId, "miss", "DODGED!", actor));
          } else {
            const label = multi > 1 ? `MEGA COMBO -${dmg}!!` : `HEAVY -${dmg}!`;
            newLogs.push(logWithPos(next.tick, actorId, "hit", label, target));
          }
          target.hp = Math.max(0, target.hp - dmg);
          actor.damageMultiplier = 1;
          actor.cooldowns.heavy = 3;
        } else {
          newLogs.push(logWithPos(next.tick, actorId, "miss", "HEAVY WHIFF", actor));
        }
        break;
      }
    }
  };

  resolveAttack(red, "red", redAction, blue, "blue", redWasStunned);
  resolveAttack(blue, "blue", blueAction, red, "red", blueWasStunned);

  // Parry whiff — if you parried but nobody attacked you
  if (red.isParrying && !blue.isStunned && !["punch", "shoot", "heavy"].includes(blueAction.action)) {
    newLogs.push(logWithPos(next.tick, "red", "miss", "PARRY WHIFF", red));
  }
  if (blue.isParrying && !red.isStunned && !["punch", "shoot", "heavy"].includes(redAction.action)) {
    newLogs.push(logWithPos(next.tick, "blue", "miss", "PARRY WHIFF", blue));
  }

  // Check KO
  if (red.hp <= 0 || blue.hp <= 0) {
    if (red.hp <= 0 && blue.hp <= 0) {
      next.status = "ko";
      next.winner = "draw";
      newLogs.push(logWithPos(next.tick, "red", "ko", "DOUBLE KO!", red));
    } else if (red.hp <= 0) {
      next.status = "ko";
      next.winner = "blue";
      newLogs.push(logWithPos(next.tick, "red", "ko", "K.O.!", red));
    } else {
      next.status = "ko";
      next.winner = "red";
      newLogs.push(logWithPos(next.tick, "blue", "ko", "K.O.!", blue));
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
      message: `TIME'S UP! ${next.winner === "draw" ? "DRAW!" : `${next.winner?.toUpperCase()} WINS!`}`,
    });
  }

  next.log = [...next.log, ...newLogs];
  return next;
}

export function buildTickInput(state: GameState, fighterId: "red" | "blue"): string {
  const me = state.fighters[fighterId === "red" ? 0 : 1];
  const enemy = state.fighters[fighterId === "red" ? 1 : 0];
  const recentLogs = state.log.slice(-10);

  const dist = Math.abs(me.x - enemy.x) + Math.abs(me.y - enemy.y);

  const input = {
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
    history: recentLogs,
  };

  return JSON.stringify(input);
}

export const SYSTEM_RULES = `You fight in a 10x8 grid arena. Each tick you choose 1 move and 1 action.

COMBAT RULES:
- punch: hits if distance <= 2, deals 2 damage
- shoot: hits if distance 1-5, deals 1 damage
- heavy: hits if distance <= 2, deals 3 damage, cooldown 3 ticks after use
- block: halves melee damage, blocks shots completely
- dodge: invulnerable this tick, cooldown 4 ticks
- parry: if enemy attacks you THIS tick, they get STUNNED next tick and your next attack deals DOUBLE damage. If they don't attack, you waste your turn. Cooldown 5 ticks.
- STUNNED = cannot move or act for 1 tick

TIPS:
- Move up/down to flank, not just left/right
- "distance" in the input tells you how far the enemy is
- Use heavy when close for big damage, but it has a cooldown
- Parry is high risk high reward — predict enemy attacks

You must respond with exactly one JSON object. No other text.

Example: {"move":"right","action":"punch"}
Example: {"move":"up","action":"shoot"}
Example: {"move":"none","action":"block"}`;
