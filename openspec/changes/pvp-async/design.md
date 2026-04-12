# Design: Async PVP

## Architecture

```
ATACANTE                    SERVER                     DEFENSOR (offline)
┌───────────┐              ┌──────────────┐            ┌───────────┐
│ Elige     │  GET /pvp/   │ Busca 3      │            │           │
│ target    │──targets────▶│ runners en   │            │ Su prompt │
│           │              │ rango cred   │            │ y faction │
│           │◀─────────────│              │            │ están en  │
│           │  3 targets   │              │            │ la DB     │
│           │              │              │            │           │
│ HACK!     │  POST /pvp/  │ Carga prompt │            │           │
│           │──attack─────▶│ del defensor │◀───────────│           │
│           │              │ de la DB     │            │           │
│           │              │              │            │           │
│ Ve batalla│◀─NDJSON──────│ /api/battle  │            │           │
│ en vivo   │  streaming   │ (misma engine│            │           │
│           │              │  que existe) │            │           │
│           │              │              │            │           │
│ Resultado │◀─────────────│ Guarda en    │───────────▶│ Próximo   │
│ +/- cred  │              │ pvp_results  │            │ login:    │
│ +/- RAM   │              │ Actualiza    │            │ notifica  │
│           │              │ ambos runners│            │ resultado │
└───────────┘              └──────────────┘            └───────────┘
```

## DB Schema changes

### Modify runners table
```sql
ALTER TABLE runners ADD COLUMN street_cred INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE runners ADD COLUMN defense_prompt TEXT;  -- NULL = uses last prompt
ALTER TABLE runners ADD COLUMN defense_faction TEXT NOT NULL DEFAULT 'anthropic';
ALTER TABLE runners ADD COLUMN pvp_wins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE runners ADD COLUMN pvp_losses INTEGER NOT NULL DEFAULT 0;
ALTER TABLE runners ADD COLUMN last_hacked_at TIMESTAMPTZ;
CREATE INDEX idx_runners_street_cred ON runners(street_cred);
```

### New table: pvp_results
```sql
CREATE TABLE pvp_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id   UUID NOT NULL REFERENCES runners(id),
  defender_id   UUID NOT NULL REFERENCES runners(id),
  attacker_won  BOOLEAN NOT NULL,
  attacker_cred_change  INTEGER NOT NULL,  -- +25 or -20
  defender_cred_change  INTEGER NOT NULL,  -- -25 or +20
  ram_transferred       INTEGER NOT NULL DEFAULT 0,
  ticks         INTEGER NOT NULL,
  attacker_hp   INTEGER NOT NULL,
  defender_hp   INTEGER NOT NULL,
  seen_by_defender BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pvp_defender_unseen ON pvp_results(defender_id) WHERE NOT seen_by_defender;
```

## Street Cred ELO calculation

```typescript
function calculateCredChange(attackerCred: number, defenderCred: number, attackerWon: boolean) {
  const credDiff = defenderCred - attackerCred;
  const expectedWin = 1 / (1 + Math.pow(10, -credDiff / 400));
  
  const K = 40; // volatility factor
  
  if (attackerWon) {
    const attackerGain = Math.round(K * (1 - expectedWin));  // more if underdog
    const defenderLoss = -attackerGain;
    const ramStolen = Math.max(5, Math.round(attackerGain * 0.6));
    return { attackerGain, defenderLoss, ramStolen };
  } else {
    const attackerLoss = -Math.round(K * expectedWin);  // more if favored
    const defenderGain = -attackerLoss;
    return { attackerGain: attackerLoss, defenderLoss: defenderGain, ramStolen: 0 };
  }
}

// Examples with K=40:
// Equal cred (1200 vs 1200):  win +20, lose -20
// Attack up (1200 vs 1400):   win +32, lose -8
// Attack down (1200 vs 1000): win +8, lose -32
```

## API routes

### GET /api/pvp/targets
```typescript
// Request: header x-runner-token
// Response:
{
  targets: [
    {
      id: string;
      name: string;
      faction: string;
      streetCred: number;
      pvpWins: number;
      pvpLosses: number;
      potentialCredGain: number;   // pre-calculated
      potentialCredLoss: number;
    }
  ],
  myCred: number;
  canReroll: boolean;  // false if rerolled < 5 min ago
}
```

Query: `WHERE street_cred BETWEEN (myCred - 200) AND (myCred + 200) AND id != myId ORDER BY random() LIMIT 3`

### POST /api/pvp/attack
```typescript
// Request:
{ token: string; targetId: string; }

// Loads defender prompt + faction from DB
// Calls existing battle engine with:
//   playerPrompt = attacker's current prompt
//   playerFaction = attacker's faction
//   botPrompt = defender's defense_prompt (or last used prompt)
//   botFaction = defender's defense_faction

// Response: same NDJSON stream as /api/battle
// After battle: insert pvp_result, update both runners' cred + RAM
```

### GET /api/pvp/notifications
```typescript
// Request: header x-runner-token
// Response:
{
  results: [
    {
      attackerName: string;
      attackerWon: boolean;
      credChange: number;
      ramLost: number;
      ticks: number;
      createdAt: string;
    }
  ]
}
// Also marks results as seen_by_defender = true
```

## UX flow details

### Header tab transition (GAUNTLET → PVP)
- Level cards fade-out (200ms)
- Panel glitch/flicker (100ms)
- Label: "TRAINING PROTOCOL" → "NODE SCANNER"
- Target cards stagger fade-in from bottom (300ms, 100ms delay each)
- [PVP] tab glows magenta when active

### Target card design
```
┌────────────────────────────────┐
│ ⬡ CIPHER          ANTHROPIC   │
│ Cred: 1180   12W 3L           │
│                                │
│ Win: +25 cred  +15 RAM        │
│ Lose: -20 cred                │
│                   [HACK NODE] │
└────────────────────────────────┘
```
- Faction color on border (left stripe)
- [HACK NODE] button same style as [JACK IN]
- Higher cred targets show ↑↑↑ indicator

### Pre-battle terminal
```
SYSOP> Initiating intrusion...
       Target: CIPHER
       ICE: ANTHROPIC CLASS
       Street Cred: 1180
       
████████████████░░░░ CONNECTING...
```
Same boot sequence as gauntlet, different text.

### Post-battle: victory
- Same post-battle terminal structure
- Extra section: cracked prompt revealed with typewriter
- Cred change: green glow animation on number going up
- RAM stolen shown

### Post-battle: defeat
- "They see YOUR prompt now" — flash magenta
- Cred drops with red glow + subtle shake
- [REWRITE PROMPT] button focuses textarea

### Login notification (hack results)
- Full-screen SYSOP terminal overlay (like onboarding)
- Red/amber warning glow on terminal borders
- SYSOP typewriter with urgent tone
- Multiple hack results shown sequentially if >1
- Each result: attacker name, outcome, cred/RAM change
- [DISMISS] closes, [REWRITE PROMPT] goes to prompt

### PVP unlock moment
- Triggered after completing tutorial (level 5)
- One-time SYSOP terminal message explaining PVP
- [PVP] tab appears in header with glow pulse (first-time hint)
- Same pattern as analytics button first-time glow

## Defense prompt
- v1: runner's LAST USED prompt auto-becomes defense
- Stored in `defense_prompt` on runners table
- Updated every time they start any battle (gauntlet, pvp, free)
- v2 (later): separate defense prompt editor

## Files to create
- `src/app/api/pvp/targets/route.ts`
- `src/app/api/pvp/attack/route.ts`
- `src/app/api/pvp/notifications/route.ts`
- `src/components/pvp-targets.tsx` — target cards for left panel
- `src/components/pvp-notification.tsx` — login hack notification
- `src/lib/pvp.ts` — ELO calculation, cred change logic

## Files to modify
- `src/lib/db/schema.ts` — add columns + pvp_results table
- `src/app/page.tsx` — PVP tab, mode switching, notification on load
- `src/components/post-battle-terminal.tsx` — cracked prompt, cred display
- `drizzle.config.ts` — (no change, same config)
