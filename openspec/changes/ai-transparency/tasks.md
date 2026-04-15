# Tasks: AI Transparency + Context Memory

## Bloque 1 — Context Memory Data + Schema (~5 min AI)
- [x] Add CONTEXT_LEVELS array to src/lib/implants.ts
- [x] Add contextLevel column to runners table in schema.ts
- [x] Run drizzle-kit push

## Bloque 2 — Engine: Variable Context Window (~5 min AI)
- [x] Parameterize buildTickInput() to accept contextWindow (0-50)
- [x] 0 = no history at all (empty array), N = last N logs
- [x] /api/battle: accept redContextWindow/blueContextWindow, pass to buildTickInput
- [x] Load runner's context level from loadout and pass to battle

## Bloque 3 — AI Decision in Combat Log (~10 min AI)
- [x] Pass _debug decisions data to CombatLog component
- [x] Show "→ MOVE + ACTION (🧠 N ticks)" line before result for player ticks
- [ ] Color-code decisions: good (hit) green, bad (miss on blocking enemy) amber

## Bloque 4 — Context Meter in Cockpit (~5 min AI)
- [ ] Show context level name + tick count during battle in header or near arena
- [ ] Progress bar fills as ticks accumulate (current_tick / contextWindow)
- [ ] Visible only during active battle

## Bloque 5 — RipperDoc: OS Category (~10 min AI)
- [x] Add OS filter tab alongside neural/cyber/stims
- [x] Render context levels as upgrade cards (show current level, next available)
- [x] Buy = upgrade (replace current, deduct credits, update DB)
- [x] /api/ripper/buy: handle type "os"

## Bloque 6 — Adherence Score (~5 min AI)
- [ ] Modify /api/sysop prompt to include adherence analysis (0-100%)
- [ ] Display adherence % in post-battle terminal alongside analytics
- [ ] SYSOP comments on deviations (smart improvisation vs bad decisions)

## Test
- [x] Context 0: AI receives no history in tick input
- [x] Context 10: AI receives last 10 logs
- [x] Context 50: AI receives last 50 logs
- [x] Buy OS upgrade: contextLevel updates in DB
- [x] Combat log shows AI decision per tick
- [ ] Context meter visible during battle
- [ ] Adherence score shows in SYSOP report
- [ ] Higher context = noticeably smarter AI behavior
