# Tasks: Async PVP

## Bloque 1 — DB + Schema (~5 min AI)
- [x] Add street_cred, defense_prompt, defense_faction, pvp_wins, pvp_losses, last_hacked_at to runners schema
- [x] Create pvp_results table in schema.ts
- [x] Run drizzle-kit push

## Bloque 2 — ELO + Core Logic (~5 min AI)
- [x] Create src/lib/pvp.ts — calculateCredChange (ELO asymmetric), target selection logic
- [x] Export types for PVP results

## Bloque 3 — API Routes (~15 min AI)
- [x] GET /api/pvp/targets — 3 random runners within ±200 cred
- [x] POST /api/pvp/attack — load defender prompt, run battle engine, stream NDJSON, save pvp_result, update both runners
- [x] GET /api/pvp/notifications — unseen hack results for defender
- [x] Auto-save defense_prompt on every battle start (gauntlet/pvp/free)

## Bloque 4 — UI: PVP Mode (~15 min AI)
- [x] Add [PVP] tab to header (magenta glow when active)
- [x] Create pvp-targets.tsx — target cards with faction color, cred, potential gain/loss
- [x] Mode switching in left panel: gauntlet levels ↔ pvp targets
- [x] Reroll button with 5 min cooldown
- [x] [HACK NODE] button triggers battle
- [ ] Pre-battle terminal overlay: "Initiating intrusion... Target: X"

## Bloque 5 — UI: Post-Battle PVP (~10 min AI)
- [x] Post-battle terminal: show cracked prompt on win (typewriter reveal)
- [x] Show Street Cred change (green glow up / red shake down)
- [x] Show RAM stolen/lost
- [x] "They see YOUR prompt now" on defeat
- [x] [HACK ANOTHER] / [REWRITE PROMPT] buttons

## Bloque 6 — UI: Defensive Notifications (~10 min AI)
- [x] On game load: check /api/pvp/notifications
- [x] If unseen results: show SYSOP terminal overlay with red/amber glow
- [x] Typewriter each result: attacker name, outcome, cred/RAM change
- [x] [DISMISS] / [REWRITE PROMPT] buttons
- [x] Mark results as seen after display

## Bloque 7 — PVP Unlock (~5 min AI)
- [x] Trigger SYSOP message after tutorial complete (level 5)
- [ ] One-time terminal explaining PVP concept
- [x] [PVP] tab glow pulse on first appearance
- [x] localStorage flag: battleai_pvp_unlocked

## Bloque 8 — Transitions + Polish (~5 min AI)
- [x] Fade-out/fade-in between gauntlet and PVP panels
- [x] Panel label: "TRAINING PROTOCOL" → "NODE SCANNER"
- [x] Target card stagger animation
- [x] Street Cred display in header (alongside score)

## Test
- [x] PVP unlock triggers after level 5
- [ ] Targets load within cred range
- [ ] Battle runs with defender prompt
- [ ] Win: cred up, RAM stolen, prompt revealed
- [ ] Lose: cred down, prompt exposed
- [ ] Notification shows on next login
- [x] Can't attack self
- [x] ELO gives more for beating higher cred
