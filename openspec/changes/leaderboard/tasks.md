# Tasks: Leaderboard & Runner Persistence

## Bloque 1 — DB Setup (~10 min AI)
- [ ] Install deps: drizzle-orm, drizzle-kit, @neondatabase/serverless
- [ ] Create `drizzle.config.ts` pointing to DATABASE_URL
- [ ] Create `src/lib/db/index.ts` — neon serverless client + drizzle instance
- [ ] Create `src/lib/db/schema.ts` — runners + battle_results tables
- [ ] Kilian: install Neon from Vercel Marketplace → get DATABASE_URL
- [ ] Run `drizzle-kit push` to create tables

## Bloque 2 — Token Identity (~5 min AI)
- [ ] Generate UUID token on first visit, store in `localStorage["battleai_token"]`
- [ ] Create runner row on first POST (find-or-create by token)

## Bloque 3 — Score API (~10 min AI)
- [ ] Create `POST /api/score` — receive battle data, recalculate score server-side, upsert runner, insert battle_result
- [ ] Return rank + total runners in response
- [ ] Call POST /api/score from page.tsx after each battle ends

## Bloque 4 — Leaderboard API (~5 min AI)
- [ ] Create `GET /api/leaderboard` — top 100 runners by total_score DESC
- [ ] Include myRank if token provided via header

## Bloque 5 — Leaderboard Page (~10 min AI)
- [ ] Create `/leaderboard/page.tsx` — CRT terminal styled table
- [ ] Show: rank, name, score, W/D/L, RAM, level, date
- [ ] Highlight current runner row
- [ ] Mobile responsive
- [ ] Link from main game page to leaderboard

## Bloque 6 — Polish (~5 min AI)
- [ ] Show rank in post-battle terminal ("You're ranked #X!")
- [ ] Add leaderboard link to header/nav
- [ ] Build, test, deploy

## Test
- [ ] Fresh user: plays battle → score saved → appears on leaderboard
- [ ] Returning user: token persists → scores accumulate
- [ ] Leaderboard loads with correct ranking
- [ ] Mobile: leaderboard readable
