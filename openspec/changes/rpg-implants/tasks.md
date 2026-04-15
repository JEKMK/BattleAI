# Tasks: RPG Implants, Stims & Credits

## Bloque 1 — Data + Schema (~10 min AI)
- [x] Add `credits` column to runners table
- [x] Create `runner_implants` table (runner_id, implant_id, slot_type, unique per slot)
- [x] Create `runner_stims` table (runner_id, stim_id)
- [x] Create `src/lib/implants.ts` — 30 items (10 neural, 10 cyberware, 10 stims) with lore
- [x] Run drizzle-kit push

## Bloque 2 — Combat Config (~10 min AI)
- [x] Parameterize `engine.ts` resolveTick: replace hardcoded dmg/cooldown/HP with CombatEffects
- [x] Parameterize `engine.ts` buildSystemRules: inject implant descriptions into LLM prompt
- [x] Add regen mechanic (heal 1 HP every N ticks if config.regenPerTicks > 0)
- [x] Add allDmgBonus to all attack damage calculations
- [x] Add punchRange, shootRange, heavyRange, firstStrikeDmg support

## Bloque 3 — API Routes (~10 min AI)
- [x] GET /api/ripper/stock — all items with prices, owned status
- [x] POST /api/ripper/buy — validate credits, equip implant (replace if slot full), consume stim
- [x] GET /api/ripper/loadout — runner's current implants + stims + credits
- [x] Modify POST /api/score — add credit reward (level × 20)
- [ ] Modify POST /api/pvp/attack — add credit reward (win: 50 + credGain×2, lose: 10)

## Bloque 4 — Battle Integration (~10 min AI)
- [x] Modify /api/battle — load runner's implants/stims from DB, build combat config, pass to engine
- [ ] Modify /api/pvp/attack — load attacker implants, build config
- [ ] Consume stims after battle (delete from runner_stims)
- [x] Pass combat config to buildSystemRules for prompt injection

## Bloque 5 — RipperDoc Terminal UI (~15 min AI)
- [x] Create ripper-terminal.tsx — overlay modal, grid layout, 3 columns
- [x] Category filter: ALL / NEURAL / CYBER / STIMS / OS
- [x] Sort: price asc/desc, A-Z
- [x] Lore on hover (? icon appears on card hover, tooltip on ?)
- [x] Buy flow: click [BUY] → SYSOP confirms → auto-equip → stats update live

## Bloque 6 — Header + Log Integration (~10 min AI)
- [x] Add [RIPPER] button to header with credits display
- [x] Show equipped implant icons in header
- [x] Combat log: append implant icon when modified action occurs
- [x] Load runner loadout on page mount, pass to arena/combat components

## Test
- [x] Buy implant → credits deducted → appears in deck
- [ ] Replace implant in same slot → old replaced, no refund
- [ ] Buy stim → consumed after 1 battle
- [ ] Battle with Gorilla Arms → punch does 3 DMG
- [ ] Battle with Kiroshi → accuracy improved
- [ ] Battle with Subdermal → 12 HP
- [ ] Battle with Black Lace → +1 all DMG, consumed after
- [x] LLM prompt shows modified stats
- [x] Combat log shows implant markers
- [x] Credits awarded from gauntlet
