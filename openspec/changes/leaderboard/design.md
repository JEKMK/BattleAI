# Design: Leaderboard & Runner Persistence

## Architecture

```
Browser (localStorage)              Server (Neon Postgres)
┌──────────────────────┐            ┌──────────────────────┐
│ battleai_token: UUID │───────────▶│ runners              │
│ battleai_runner      │            │   token (unique idx)  │
│ battleai_gauntlet    │            │   name, score, W/D/L  │
└──────────────────────┘            ├──────────────────────┤
                                    │ battle_results       │
  POST /api/score ─────────────────▶│   runner_id, level,  │
  (after each battle)               │   score, ticks, etc  │
                                    └──────────────────────┘
                                             │
  GET /api/leaderboard ◀─────────────────────┘
  (top 100 runners)
```

## Identity: UUID token

First visit → generate UUID → store in localStorage as `battleai_token`.
Every API call includes this token. Server looks up runner by token.

- No auth friction — play immediately, appear on leaderboard
- Future: link Google/email to existing token → progress preserved
- If token lost (cleared localStorage) → new anonymous runner (acceptable for jam)

## Database: Neon Postgres + Drizzle ORM

### Why Neon
- Free via Vercel Marketplace (already integrated)
- Serverless driver (`@neondatabase/serverless`) — no connection pool needed
- Scales to zero when idle (free tier friendly)

### Why Drizzle
- TypeScript schema = types auto-generated
- `drizzle-kit push` for schemaless migrations (no migration files for now)
- Lightweight — no query engine, just SQL builder

## Schema

### runners
```sql
CREATE TABLE runners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       UUID NOT NULL UNIQUE,          -- localStorage identity
  name        TEXT NOT NULL DEFAULT 'ANONYMOUS',
  total_score INTEGER NOT NULL DEFAULT 0,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  draws       INTEGER NOT NULL DEFAULT 0,
  ram         INTEGER NOT NULL DEFAULT 200,
  current_level INTEGER NOT NULL DEFAULT 0,
  best_score_date TIMESTAMPTZ,               -- when highest score was achieved
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runners_total_score ON runners(total_score DESC);
CREATE INDEX idx_runners_token ON runners(token);
```

### battle_results
```sql
CREATE TABLE battle_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id   UUID NOT NULL REFERENCES runners(id),
  level       INTEGER NOT NULL,
  won         BOOLEAN NOT NULL,
  score       INTEGER NOT NULL DEFAULT 0,    -- server-calculated
  ticks       INTEGER NOT NULL,
  hp_left     INTEGER NOT NULL,
  enemy_hp_max INTEGER NOT NULL,
  faction     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_battle_results_runner ON battle_results(runner_id);
```

## API Routes

### POST /api/score
Called after each battle completes.

```typescript
// Request
{
  token: string;        // UUID from localStorage
  name: string;         // runner name
  level: number;        // gauntlet level fought
  won: boolean;
  ticks: number;
  hpLeft: number;
  enemyHpMax: number;
  faction: string;
  // Gauntlet totals (from client state)
  totalScore: number;
  wins: number;
  losses: number;
  draws: number;
  ram: number;
  currentLevel: number;
}

// Response
{ rank: number; totalRunners: number }
```

**Server recalculates score** from ticks/hpLeft/enemyHpMax/won — ignores client totalScore for the battle_result row. Client totalScore is used for the runner aggregate (sum of all server-calculated scores).

Actually simpler: server calculates this battle's score, adds to runner's total. Client totalScore is only a hint — server is authoritative.

### GET /api/leaderboard
```typescript
// Response
{
  runners: {
    rank: number;
    name: string;
    totalScore: number;
    wins: number;
    losses: number;
    draws: number;
    ram: number;
    currentLevel: number;
    bestScoreDate: string;
  }[];
  total: number;
  myRank?: number;      // if token header provided
}
```

Query: `SELECT ... FROM runners ORDER BY total_score DESC LIMIT 100`

## Leaderboard Page: `/leaderboard`

CRT terminal aesthetic (consistent with game). Table with:

| # | RUNNER | SCORE | W/D/L | RAM | LVL | DATE |
|---|--------|-------|-------|-----|-----|------|
| 1 | NEUROMANCER | 12,450 | 14/2/1 | 950 | 15 | 2026-04-11 |
| 2 | CIPHER | 8,200 | 10/1/3 | 700 | 12 | 2026-04-10 |

- Current runner highlighted (if token matches)
- Link back to game
- Mobile responsive (horizontal scroll or card layout)

## Score Integrity

Score formula lives in `src/lib/gauntlet.ts` (shared). Server imports same function:

```
score = (enemyHpMax × 100) + max(0, (120 - ticks) × 5) + (hpLeft × 50)
```

Client sends raw battle data → server recalculates → stores server result.
Client can't inflate scores without controlling the battle API.

## Sync Strategy

1. Battle ends → client has gameState + analytics
2. Client POST /api/score with battle data + token
3. Server: find-or-create runner by token, calculate score, insert battle_result, update runner totals
4. Server responds with rank
5. Client can show "You're ranked #X!" in post-battle terminal

## Files to create/modify

### New files
- `src/lib/db/schema.ts` — Drizzle schema (runners + battle_results)
- `src/lib/db/index.ts` — DB client (neon serverless + drizzle)
- `src/app/api/score/route.ts` — POST score endpoint
- `src/app/api/leaderboard/route.ts` — GET leaderboard endpoint
- `src/app/leaderboard/page.tsx` — Leaderboard UI
- `drizzle.config.ts` — Drizzle kit config

### Modified files
- `src/app/page.tsx` — generate token on first visit, POST score after battle, link to leaderboard
- `src/lib/gauntlet.ts` — export `calculateScore` (already exported)
- `package.json` — add drizzle-orm, drizzle-kit, @neondatabase/serverless

## Tradeoffs

| Decision | Why |
|----------|-----|
| UUID token, not auth | Zero friction. Auth is a future upgrade, not a blocker |
| Drizzle push, not migrations | 2 tables, jam timeline. Migrations are overkill |
| Server score calc | Prevents trivial cheating. Client data is untrusted |
| Single POST per battle | Simple. No websockets, no batching |
| No RLS | Single table, no multi-tenant. Just index on token |
