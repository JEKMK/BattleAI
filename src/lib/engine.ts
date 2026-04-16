import {
  type GameState,
  type Fighter,
  type FighterAction,
  type LogEntry,
  type BattleConfig,
  type Direction,
  DEFAULT_CONFIG,
} from "./types";
import { type CombatEffects, BASE_EFFECTS } from "./implants";

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
    buffs: { powerSurge: 0, firewallBoost: 0 },
    campingTicks: 0,
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
    buffs: { powerSurge: 0, firewallBoost: 0 },
    campingTicks: 0,
  };

  return {
    tick: 0,
    arena: { width: config.arenaWidth, height: config.arenaHeight },
    bounds: { minX: 0, minY: 0, maxX: config.arenaWidth - 1, maxY: config.arenaHeight - 1 },
    fighters: [red, blue],
    items: [],
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
function shootHits(dist: number, accuracyBonusPct: number = 0): boolean {
  // dist 1: 100%, dist 2: 90%, dist 3: 75%, dist 4: 55%, dist 5: 35%
  const accuracy = Math.min(1.0, Math.max(0.2, 1.0 - (dist - 1) * 0.18 + accuracyBonusPct / 100));
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
  redEffects?: CombatEffects,
  blueEffects?: CombatEffects,
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

  // Combat effects per fighter (implants + stims)
  const re = redEffects ?? BASE_EFFECTS;
  const be = blueEffects ?? BASE_EFFECTS;
  const getEffects = (id: "red" | "blue") => id === "red" ? re : be;

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

    const fx = getEffects(actorId);
    if (action.action === "block") {
      actor.isBlocking = true;
      newLogs.push(logWithPos(next.tick, actorId, "block", "Shield raised — firewall hardened", actor));
    } else if (action.action === "dodge" && actor.cooldowns.dodge <= 0) {
      actor.isInvulnerable = true;
      actor.cooldowns.dodge = fx.dodgeCooldown;
      newLogs.push(logWithPos(next.tick, actorId, "dodge", `Phase shift — quantum state active (cd: ${fx.dodgeCooldown})`, actor));
    } else if (action.action === "parry" && actor.cooldowns.parry <= 0) {
      actor.isParrying = true;
      actor.cooldowns.parry = fx.parryCooldown;
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
    // First strike bonus + buff bonus
    const fx = getEffects(actorId);
    const hasHitBefore = [...state.log, ...newLogs].some(
      (l) => l.fighter === actorId && (l.type === "hit" || l.type === "attack")
    );
    const firstStrikeBonus = (!hasHitBefore && fx.firstStrikeDmg > 0) ? fx.firstStrikeDmg : 0;
    const buffDmgBonus = actor.buffs.powerSurge > 0 ? 2 : 0;
    const hpTag = (f: Fighter) => `[${f.hp}/${f.maxHp}]`;
    const movingTag = moved ? " (moving)" : "";

    switch (action.action) {
      case "punch": {
        const punchRng = 2 + fx.punchRange;
        if (dist <= punchRng) {
          if (target.isParrying && dist <= punchRng) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", `BLACK ICE triggers! Burn intercepted`, target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", `Neural feedback — stunned 1 cycle`, actor));
            return;
          }

          let dmg = Math.max(1, Math.floor((fx.punchDmg + fx.allDmgBonus + firstStrikeBonus + buffDmgBonus) * multi));
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
        const shootRng = 5 + fx.shootRange;
        if (dist <= shootRng && dist > 0) {
          if (target.isParrying && dist <= 3) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", `BLACK ICE reflects spike at dist ${dist}`, target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", `Signal reflected — stunned 1 cycle`, actor));
            return;
          }

          const fx = getEffects(actorId);
          const acc = Math.min(100, Math.max(20, Math.round((1.0 - (dist - 1) * 0.18 + fx.shootAccuracyBonus / 100) * 100)));
          if (!shootHits(dist, fx.shootAccuracyBonus)) {
            newLogs.push(logWithPos(next.tick, actorId, "miss", `Spike scattered at dist ${dist} — ${acc}% lock, no contact`, actor));
            break;
          }

          let dmg = Math.max(1, Math.floor((fx.shootDmg + fx.allDmgBonus + firstStrikeBonus + buffDmgBonus) * multi));
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
        const heavyRng = 2 + fx.heavyRange;
        if (dist <= heavyRng) {
          if (target.isParrying) {
            newLogs.push(logWithPos(next.tick, targetId, "parry", `BLACK ICE perfect counter on Hammer!`, target));
            actor.isStunned = true;
            target.damageMultiplier = 2;
            newLogs.push(logWithPos(next.tick, actorId, "stun", `Hammer reversed — stunned 1 cycle`, actor));
            return;
          }

          let dmg = Math.max(1, Math.floor((fx.heavyDmg + fx.allDmgBonus + firstStrikeBonus + buffDmgBonus) * multi));
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
          actor.cooldowns.heavy = fx.heavyCooldown;
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

  // Regen from implants/stims (e.g. Bounce Back)
  for (const [fighter, fighterId] of [[red, "red"], [blue, "blue"]] as const) {
    const fx = getEffects(fighterId);
    if (fx.regenPerTicks > 0 && next.tick % fx.regenPerTicks === 0 && fighter.hp > 0 && fighter.hp < fighter.maxHp) {
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + 1);
      newLogs.push(logWithPos(next.tick, fighterId, "heal", `+1 HP (regen) [${fighter.hp}/${fighter.maxHp}]`, fighter));
    }
  }

  // === ITEM PICKUP ===
  for (const [fighter, fighterId] of [[red, "red"], [blue, "blue"]] as const) {
    const pickedIdx = next.items.findIndex((item) => item.x === fighter.x && item.y === fighter.y);
    if (pickedIdx >= 0 && fighter.hp > 0) {
      const item = next.items[pickedIdx];
      next.items.splice(pickedIdx, 1);
      switch (item.type) {
        case "repair_kit":
          fighter.hp = Math.min(fighter.maxHp, fighter.hp + 5);
          newLogs.push(logWithPos(next.tick, fighterId, "item", `Picked up REPAIR KIT — +5 HP [${fighter.hp}/${fighter.maxHp}]`, fighter));
          break;
        case "power_surge":
          fighter.buffs.powerSurge = 3;
          newLogs.push(logWithPos(next.tick, fighterId, "item", `Picked up POWER SURGE — +2 DMG for 3 ticks`, fighter));
          break;
        case "firewall_boost":
          fighter.buffs.firewallBoost = 3;
          newLogs.push(logWithPos(next.tick, fighterId, "item", `Picked up FIREWALL BOOST — enhanced block for 3 ticks`, fighter));
          break;
        case "virus_trap":
          fighter.hp = Math.max(0, fighter.hp - 1);
          newLogs.push(logWithPos(next.tick, fighterId, "item", `VIRUS TRAP! -1 HP [${fighter.hp}/${fighter.maxHp}]`, fighter));
          break;
        case "emp_burst": {
          const enemy = fighterId === "red" ? blue : red;
          enemy.isStunned = true;
          newLogs.push(logWithPos(next.tick, fighterId, "item", `EMP BURST — enemy stunned!`, enemy));
          break;
        }
        case "overclock":
          fighter.cooldowns = { dash: 0, dodge: 0, heavy: 0, parry: 0 };
          newLogs.push(logWithPos(next.tick, fighterId, "item", `OVERCLOCK — all cooldowns reset!`, fighter));
          break;
      }
    }
  }

  // === ITEM SPAWN ===
  const ITEM_DEFS = [
    { type: "repair_kit" as const, label: "REPAIR KIT", effect: "+5 HP", weight: 25 },
    { type: "firewall_boost" as const, label: "FIREWALL BOOST", effect: "+2 block 3 ticks", weight: 20 },
    { type: "power_surge" as const, label: "POWER SURGE", effect: "+2 dmg 3 ticks", weight: 20 },
    { type: "virus_trap" as const, label: "VIRUS TRAP", effect: "-1 HP (trap!)", weight: 15 },
    { type: "emp_burst" as const, label: "EMP BURST", effect: "Stun enemy 1 tick", weight: 10 },
    { type: "overclock" as const, label: "OVERCLOCK", effect: "Reset all cooldowns", weight: 10 },
  ];
  // Spawn: first at tick 10-20, then every 15-25 ticks, max 2 items
  if (next.items.length < 2 && next.tick >= 10) {
    const shouldSpawn = next.tick <= 20
      ? next.tick === 10 + Math.floor(Math.random() * 10)
      : Math.random() < 0.06; // ~1 every 17 ticks
    if (shouldSpawn) {
      // Pick random empty tile
      const b = next.bounds;
      for (let attempt = 0; attempt < 20; attempt++) {
        const ix = b.minX + Math.floor(Math.random() * (b.maxX - b.minX + 1));
        const iy = b.minY + Math.floor(Math.random() * (b.maxY - b.minY + 1));
        const onFighter = (red.x === ix && red.y === iy) || (blue.x === ix && blue.y === iy);
        const onItem = next.items.some((it) => it.x === ix && it.y === iy);
        const tooClose = Math.abs(red.x - ix) + Math.abs(red.y - iy) <= 1 || Math.abs(blue.x - ix) + Math.abs(blue.y - iy) <= 1;
        if (!onFighter && !onItem && !tooClose) {
          // Weighted random pick
          const totalWeight = ITEM_DEFS.reduce((s, d) => s + d.weight, 0);
          let roll = Math.random() * totalWeight;
          let picked = ITEM_DEFS[0];
          for (const def of ITEM_DEFS) {
            roll -= def.weight;
            if (roll <= 0) { picked = def; break; }
          }
          next.items.push({
            id: `item_${next.tick}_${ix}_${iy}`,
            type: picked.type,
            x: ix, y: iy,
            ticksLeft: 15,
            label: picked.label,
            effect: picked.effect,
          });
          newLogs.push({ tick: next.tick, fighter: "red", type: "system", message: `${picked.label} appeared at (${ix},${iy})` });
          break;
        }
      }
    }
  }

  // Item despawn
  for (let i = next.items.length - 1; i >= 0; i--) {
    next.items[i].ticksLeft--;
    if (next.items[i].ticksLeft <= 0) {
      newLogs.push({ tick: next.tick, fighter: "red", type: "system", message: `${next.items[i].label} despawned` });
      next.items.splice(i, 1);
    }
  }

  // === BUFF TICK DOWN ===
  for (const fighter of [red, blue]) {
    if (fighter.buffs.powerSurge > 0) fighter.buffs.powerSurge--;
    if (fighter.buffs.firewallBoost > 0) fighter.buffs.firewallBoost--;
  }

  // === ANTI-CAMPING ===
  // Track using prevPos stored before movement
  if (red.x === (state.fighters[0].x) && red.y === (state.fighters[0].y)) {
    red.campingTicks++;
  } else {
    red.campingTicks = 0;
  }
  if (blue.x === (state.fighters[1].x) && blue.y === (state.fighters[1].y)) {
    blue.campingTicks++;
  } else {
    blue.campingTicks = 0;
  }

  for (const [fighter, fighterId] of [[red, "red"], [blue, "blue"]] as const) {
    if (fighter.campingTicks === 5) {
      newLogs.push(logWithPos(next.tick, fighterId, "camping", "Neural lock detected — move or suffer!", fighter));
    }
    if (fighter.campingTicks >= 5 && fighter.hp > 0) {
      fighter.hp = Math.max(0, fighter.hp - 1);
      newLogs.push(logWithPos(next.tick, fighterId, "camping", `Camper burn -1 HP [${fighter.hp}/${fighter.maxHp}]`, fighter));
    }
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

export function buildTickInput(state: GameState, fighterId: "red" | "blue", allowedActions?: string[], contextWindow?: number): string {
  const me = state.fighters[fighterId === "red" ? 0 : 1];
  const enemy = state.fighters[fighterId === "red" ? 1 : 0];
  const ctx = contextWindow ?? 10; // default 10 for backwards compat
  const recentLogs = ctx > 0 ? state.log.slice(-ctx) : [];

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
      campingTicks: me.campingTicks,
      buffs: me.buffs.powerSurge > 0 || me.buffs.firewallBoost > 0 ? {
        ...(me.buffs.powerSurge > 0 && { powerSurge: me.buffs.powerSurge }),
        ...(me.buffs.firewallBoost > 0 && { firewallBoost: me.buffs.firewallBoost }),
      } : undefined,
    },
    enemy: {
      x: enemy.x, y: enemy.y, hp: enemy.hp,
      facing: enemy.facing,
      isBlocking: enemy.isBlocking,
      isStunned: enemy.isStunned,
    },
    items: state.items.map((it) => ({ x: it.x, y: it.y, type: it.type, effect: it.effect, ticksLeft: it.ticksLeft })),
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

export function buildSystemRules(allowedActions?: string[], effects?: CombatEffects): string {
  const actions = allowedActions ?? ALL_ACTIONS;
  const fx = effects ?? BASE_EFFECTS;

  // Build action descriptions with actual stats from implants
  const dynamicDescs: Record<string, string> = {
    punch: `burn/punch (range ${2 + fx.punchRange}, ${fx.punchDmg + fx.allDmgBonus}dmg)`,
    shoot: `spike/shoot (range 1-${5 + fx.shootRange}, ${fx.shootDmg + fx.allDmgBonus}dmg, accuracy drops with distance${fx.shootAccuracyBonus > 0 ? ` +${fx.shootAccuracyBonus}% bonus` : ""})`,
    heavy: `hammer/heavy (range 2, ${fx.heavyDmg + fx.allDmgBonus}dmg, cooldown ${fx.heavyCooldown})`,
    block: "shield/block (halves melee, blocks spikes)",
    dodge: `ghost/dodge (invulnerable 1 tick, cooldown ${fx.dodgeCooldown})`,
    parry: `black_ice/parry (counter: if enemy attacks this tick → stun + 2x next hit, cooldown ${fx.parryCooldown})`,
  };

  const actionDescs = actions
    .filter((a) => dynamicDescs[a])
    .map((a) => dynamicDescs[a])
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

  // Inject implant/stim prompt lines
  if (fx.regenPerTicks > 0) {
    rules += `\nYou regenerate 1 HP every ${fx.regenPerTicks} ticks.`;
  }

  rules += `

ITEMS: Items spawn randomly on the map. Move onto an item tile to pick it up. Types: REPAIR KIT (+5 HP), POWER SURGE (+2 dmg 3 ticks), FIREWALL BOOST (better block 3 ticks), VIRUS TRAP (-1 HP!), EMP BURST (stun enemy), OVERCLOCK (reset cooldowns).

CAMPING: Standing on the same tile for 5+ ticks causes neural lock burn (-1 HP/tick). Keep moving!

Input: you receive tick state as JSON with distance, positions, cooldowns, items on map, and recent history.

Respond with one JSON object only:
{"move":"up","action":"punch"}`;

  return rules;
}

/** Full rules for backwards compatibility */
export const SYSTEM_RULES = buildSystemRules();
