# Tasks: RPG Implants, Stims & Credits

## Bloque 1 — Data + Schema (~10 min AI)
- [ ] Add `credits` column to runners table
- [ ] Create `runner_implants` table (runner_id, implant_id, slot_type, unique per slot)
- [ ] Create `runner_stims` table (runner_id, stim_id)
- [ ] Create `src/lib/implants.ts` — IMPLANTS + STIMS constants with effects, costs, icons, prompt injections
- [ ] Run drizzle-kit push

## Bloque 2 — Combat Config (~10 min AI)
- [ ] Create `src/lib/combat-config.ts` — CombatConfig interface, BASE_CONFIG, buildCombatConfig()
- [ ] Parameterize `engine.ts` resolveTick: replace hardcoded dmg/cooldown/HP with config
- [ ] Parameterize `engine.ts` buildSystemRules: inject implant descriptions into LLM prompt
- [ ] Add regen mechanic (heal 1 HP every N ticks if config.regenPerTicks > 0)
- [ ] Add allDmgBonus to all attack damage calculations

## Bloque 3 — API Routes (~10 min AI)
- [ ] GET /api/ripper/stock — all items with prices, owned status
- [ ] POST /api/ripper/buy — validate credits, equip implant (replace if slot full), consume stim
- [ ] GET /api/ripper/loadout — runner's current implants + stims + credits
- [ ] Modify POST /api/score — add credit reward (level × 20)
- [ ] Modify POST /api/pvp/attack — add credit reward (win: 50 + credGain×2, lose: 10)

## Bloque 4 — Battle Integration (~10 min AI)
- [ ] Modify /api/battle — load runner's implants/stims from DB, build combat config, pass to engine
- [ ] Modify /api/pvp/attack — same: load attacker implants, build config
- [ ] Consume stims after battle (delete from runner_stims)
- [ ] Pass combat config to buildSystemRules for prompt injection

## Bloque 5 — RipperDoc Terminal UI (~15 min AI)
- [ ] Create `src/components/ripper-terminal.tsx` — overlay modal, CRT aesthetic
- [ ] Left panel: YOUR DECK — equipped implants per slot, active stims, modified stats
- [ ] Right panel: RIPPER'S STOCK — available items, prices, [BUY] buttons
- [ ] Buy flow: click [BUY] → SYSOP confirms → auto-equip → stats update live
- [ ] Credits display, disabled buy if can't afford, EQUIPPED badge

## Bloque 6 — Header + Log Integration (~10 min AI)
- [ ] Add [RIPPER] button to header with credits display
- [ ] Show equipped implant icons in header (🦾🔫🛡🧠)
- [ ] Combat log: append implant icon when modified action occurs
- [ ] Load runner loadout on page mount, pass to arena/combat components

## Test
- [ ] Buy implant → credits deducted → appears in deck
- [ ] Replace implant in same slot → old replaced, no refund
- [ ] Buy stim → consumed after 1 battle
- [ ] Battle with Gorilla Arms → punch does 3 DMG
- [ ] Battle with Kiroshi → accuracy improved
- [ ] Battle with Subdermal → 12 HP
- [ ] Battle with Black Lace → +1 all DMG, consumed after
- [ ] LLM prompt shows modified stats
- [ ] Combat log shows implant markers
- [ ] Credits awarded from gauntlet + PVP
