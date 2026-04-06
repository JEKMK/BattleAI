# Design: Progressive Tutorial

## Engine changes

### Action filtering in resolveTick
```
resolveTick(state, redAction, blueAction, redFirst, allowedActions?)
```
- If `allowedActions` is provided and action is not in list → convert to "none"
- Applied BEFORE defense/offense phases
- Affects both player AND bot (ensures fair play)
- Move filtering NOT needed — movement is always available

### Dynamic SYSTEM_RULES generator
```
function buildSystemRules(allowedActions: string[]): string
```
- Only describes actions in the allowed list
- Move rules always included
- Cooldown/stun rules only mentioned when relevant actions exist
- Mobility penalty always mentioned (move + attack = half damage is fundamental)
- Firewall shrink only mentioned for levels with 10x8+ arenas

### buildTickInput changes
- Add `availableActions: string[]` to the JSON sent to LLM each tick
- LLM knows exactly what it can do

## GauntletLevel schema changes

```ts
interface GauntletLevel {
  level: number;
  name: string;
  title: string;
  faction: Faction;
  prompt: string;
  hp: number;
  tokenReward: number;
  // NEW fields:
  isTutorial?: boolean;          // marks as tutorial level
  allowedActions?: string[];     // if set, restricts actions for both sides
  arenaWidth?: number;           // override default 10
  arenaHeight?: number;          // override default 8
  playerHp?: number;             // override default HP for player
  preHint?: string;              // SYSOP hint shown before battle
  unlockMessage?: string;        // shown after winning ("You unlocked SPIKE!")
}
```

## Pre-battle SYSOP hint

Rendered in the SYSOP terminal component (reusable!) above the JACK IN button area when a tutorial level is selected. 2-3 lines max. Example:

```
SYSOP> First run. Simple construct ahead.
All you have: MOVE and BURN. Get close. Hit it.
```

Shown inline in the left panel, above the JACK IN button. Not a modal, not a popup — part of the natural flow.

## Post-battle prompt analysis

Added to the SYSOP report API call. The battle summary sent to Gemini now includes:
- The player's actual prompt text
- Instruction: "Analyze how the player's prompt influenced their construct's behavior. Be specific: 'your prompt said X, so your construct did Y'. Give ONE concrete tip for improvement."

This leverages the existing SYSOP narrator persona but adds a teaching dimension.

## Combat log simplification

Tutorial levels get `simplifiedLog: true` on the GauntletLevel.
When active, the combat log component:
- Strips lore flavor from messages
- Shows: `[P] BURN -2 → [Bot 4/6 ICE]`
- Hides system messages (firewall warnings, etc.)
- Still shows all events, just cleaner

After tutorials complete, full log with lore unlocks.

## Tutorial gate

- `localStorage.battleai_tutorial_complete` flag
- Until set, only tutorial levels visible in gauntlet list
- Current gauntlet levels hidden behind "LOCKED — Complete tutorial" message
- After tutorial, all levels unlock and tutorial can be replayed but isn't required

## Files to modify

- `src/lib/engine.ts` — allowedActions filtering, dynamic SYSTEM_RULES builder
- `src/lib/gauntlet.ts` — new tutorial levels, schema changes
- `src/lib/types.ts` — BattleConfig changes for arena size/HP overrides
- `src/app/api/battle/route.ts` — pass allowedActions + arena config to engine
- `src/app/page.tsx` — pre-battle hints, tutorial gate, simplified log toggle
- `src/components/combat-log.tsx` — simplified mode
- `src/app/api/sysop/route.ts` — prompt analysis in SYSOP report
