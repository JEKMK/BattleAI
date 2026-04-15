# Tasks: Leaderboard & Runner Persistence

## Bloque 1 — DB Setup (~10 min AI)
- [x] Install deps: drizzle-orm, drizzle-kit, @neondatabase/serverless
- [x] Create `drizzle.config.ts` pointing to DATABASE_URL
- [x] Create `src/lib/db/index.ts` — neon serverless client + drizzle instance
- [x] Create `src/lib/db/schema.ts` — runners + battle_results tables
- [x] Kilian: install Neon from Vercel Marketplace → get DATABASE_URL
- [x] Run `drizzle-kit push` to create tables

## Bloque 2 — Token Identity (~5 min AI)
- [x] Generate UUID token on first visit, store in `localStorage["battleai_token"]`
- [x] Create runner row on first POST (find-or-create by token)

## Bloque 3 — Score API (~10 min AI)
- [x] Create `POST /api/score` — receive battle data, recalculate score server-side, upsert runner, insert battle_result
- [x] Return rank + total runners in response
- [x] Call POST /api/score from page.tsx after each battle ends

## Bloque 4 — Leaderboard API (~5 min AI)
- [x] Create `GET /api/leaderboard` — top 100 runners by total_score DESC
- [x] Include myRank if token provided via header

## Bloque 5 — Leaderboard Page (~10 min AI)
- [x] Create leaderboard as overlay modal (not separate page)
- [x] Show: rank, name, score, W/D/L, RAM, credits, level, date
- [x] Highlight current runner row
- [x] Mobile responsive
- [x] Link from main game page to leaderboard

## Bloque 6 — Polish (~5 min AI)
- [x] Show rank in post-battle terminal ("You're ranked #X!")
- [x] Add leaderboard link to header/nav
- [x] Build, test, deploy

## Test
- [x] Fresh user: plays battle → score saved → appears on leaderboard
- [x] Returning user: token persists → scores accumulate
- [x] Leaderboard loads with correct ranking
- [x] Mobile: leaderboard readable
