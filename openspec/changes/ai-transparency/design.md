# Design: AI Transparency + Context as RPG Stat

## How Context Memory works in the engine

Currently hardcoded in `engine.ts` line 419:
```typescript
const recentLogs = state.log.slice(-10);
```

Changes to:
```typescript
const recentLogs = state.log.slice(-(contextWindow || 0));
```

Where `contextWindow` comes from the runner's Context Memory level, passed through the battle API.

```
BATTLE FLOW WITH CONTEXT:

  Runner has contextMemory = 20 (STRATEGIC)
       │
       ▼
  /api/battle receives contextWindow: 20
       │
       ▼
  Each tick: buildTickInput(state, "red", actions, 20)
       │
       ▼
  JSON sent to LLM includes:
  {
    tick: 45,
    distance: 3,
    you: { hp: 7, ... },
    enemy: { hp: 4, ... },
    history: [last 20 log entries]    ← THIS changes with level
  }
       │
       ▼
  LLM with 20 ticks of history can see:
  "enemy blocked 3 times in last 5 ticks → probably blocking again → use heavy"
  
  vs LLM with 0 ticks:
  "I see an enemy at dist 3. I'll... shoot? punch? who knows"
```

## Context Memory data

### New field in implants.ts — OS category items
```typescript
export interface ContextMemoryLevel {
  id: string;
  level: number;
  name: string;
  ticks: number;
  cost: number;
  description: string;
  lore: string;
}

export const CONTEXT_LEVELS: ContextMemoryLevel[] = [
  { id: "ctx_0", level: 0, name: "AMNESIAC",    ticks: 0,  cost: 0,   description: "No memory", lore: "Your construct boots fresh every cycle. No past. No future. Just the now." },
  { id: "ctx_1", level: 1, name: "SHORT-TERM",  ticks: 5,  cost: 100, description: "5 tick memory", lore: "Cheap neural buffer. Enough to remember what happened a second ago. Barely." },
  { id: "ctx_2", level: 2, name: "TACTICAL",    ticks: 10, cost: 200, description: "10 tick memory", lore: "Standard combat memory. Your construct starts to notice patterns. Block-punch-block. Predictable enemies beware." },
  { id: "ctx_3", level: 3, name: "STRATEGIC",   ticks: 20, cost: 350, description: "20 tick memory", lore: "Military-grade recall. Your AI plans combos, reads rhythm, adapts mid-fight. This is where prompts start to matter." },
  { id: "ctx_4", level: 4, name: "DEEP MEMORY", ticks: 35, cost: 500, description: "35 tick memory", lore: "Ono-Sendai's forbidden firmware. Your construct sees the matrix in slow motion. Every pattern, every habit, every weakness." },
  { id: "ctx_5", level: 5, name: "TOTAL RECALL",ticks: 50, cost: 800, description: "50 tick memory", lore: "The full Dixie Flatline experience. Your AI remembers everything. Every tick. Every decision. The enemy has nowhere to hide." },
];
```

### DB: add contextLevel to runners
```sql
ALTER TABLE runners ADD COLUMN context_level INTEGER NOT NULL DEFAULT 0;
```

## AI Decision in combat log

The `_debug` field already streams `redAction` and `blueAction` per tick. Currently hidden from the user. We expose it.

### In the combat log, BEFORE the result line:
```
045 [P] → RIGHT + SHOOT  (🧠 20 ticks)
045 [P] Spike deflected by firewall
045 [B] → LEFT + BLOCK
045 [B] Shield raised — firewall hardened
```

The `→` prefix + action pair shows what the AI chose. The brain emoji + number shows how much context it had. Players learn to read this: "my AI chose SHOOT against a BLOCKING enemy — I need to add 'don't shoot when enemy blocks' to my prompt."

### Implementation
In `page.tsx`, the `_debug` data is already parsed from the NDJSON stream. We pass it to CombatLog as an optional `decisions` map per tick.

## Context meter in cockpit

During battle, show in the center panel near the arena:
```
🧠 TACTICAL — 10 ticks
██████████░░░░░░░░░░░░░░░  20%
```

Small bar under the arena or in the header stats. Shows current context level name + how full the history buffer is (fills up as ticks progress).

## Adherence score — post-battle

The SYSOP report already analyzes the player's prompt vs behavior. We formalize it:

### Modify /api/sysop prompt to include:
```
Analyze the player's prompt and compare it to their AI's actual behavior.
Rate prompt adherence 0-100%:
- Did the AI follow the player's instructions?
- Where did it deviate?
- Were deviations smart (improvisation) or dumb (ignoring orders)?

Include in your report:
ADHERENCE: XX%
```

### Display in post-battle analytics:
```
SYSOP DEBRIEF
═══════════════
Battle analysis complete.
> Subroutines: BURN 45%, SPIKE 30%...
> Adherence: 72%
> Result: ICE CRACKED ✓

SYSOP> Your construct followed orders 72% of the time.
The other 28%? Some good instincts. Some... not.
```

## RipperDoc integration

Context Memory appears as a new category in RipperDoc — "OS" (Operating System):
```
[ALL] [🧠 NEURAL] [🦾 CYBER] [💊 STIMS] [💻 OS]
```

OS items are the context levels. Only one can be active (current level). Buying a higher level replaces the current one. Always an upgrade path, no sideways moves.

The OS card in RipperDoc:
```
┌──────────────────────────────┐
│ 💻 TACTICAL (LVL 2)         │
│ 10 tick memory               │
│ "Standard combat memory..."  │
│ ¤200            [UPGRADE]    │
└──────────────────────────────┘
```

Shows "UPGRADE" instead of "BUY" since it's a level progression. Current level shown as "CURRENT" badge.

## API changes

### /api/battle — accept contextWindow
```typescript
body: {
  ...existing,
  redContextWindow?: number;   // from runner's context level
  blueContextWindow?: number;  // from defender's context level (PVP)
}
```

### buildTickInput() — parameterize history window
```typescript
export function buildTickInput(
  state: GameState, 
  fighterId: "red" | "blue", 
  allowedActions?: string[],
  contextWindow?: number        // NEW: 0-50
): string {
  const recentLogs = contextWindow != null && contextWindow > 0 
    ? state.log.slice(-contextWindow) 
    : [];   // 0 = no history at all
  ...
}
```

### /api/ripper/buy — handle OS upgrades
If type === "os", validate it's a higher level than current, deduct credits, update runner.context_level.

### /api/score — sync context_level
Include context_level in runner updates so DB stays in sync.

## Files to create
- None new — all changes fit in existing files

## Files to modify
- `src/lib/implants.ts` — add CONTEXT_LEVELS array
- `src/lib/db/schema.ts` — add contextLevel to runners
- `src/lib/engine.ts` — parameterize buildTickInput history window
- `src/app/api/battle/route.ts` — pass contextWindow to buildTickInput
- `src/app/api/ripper/buy/route.ts` — handle "os" type purchases
- `src/app/page.tsx` — pass contextLevel to battle, show context meter
- `src/components/ripper-terminal.tsx` — add OS filter tab + context level cards
- `src/components/combat-log.tsx` — show AI decision (move + action) per tick
- `src/app/api/sysop/route.ts` — add adherence scoring to SYSOP prompt
