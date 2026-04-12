# Tasks: Async PVP

## Bloque 1 — DB + Schema (~5 min AI)
- [ ] Add street_cred, defense_prompt, defense_faction, pvp_wins, pvp_losses, last_hacked_at to runners schema
- [ ] Create pvp_results table in schema.ts
- [ ] Run drizzle-kit push

## Bloque 2 — ELO + Core Logic (~5 min AI)
- [ ] Create src/lib/pvp.ts — calculateCredChange (ELO asymmetric), target selection logic
- [ ] Export types for PVP results

## Bloque 3 — API Routes (~15 min AI)
- [ ] GET /api/pvp/targets — 3 random runners within ±200 cred
- [ ] POST /api/pvp/attack — load defender prompt, run battle engine, stream NDJSON, save pvp_result, update both runners
- [ ] GET /api/pvp/notifications — unseen hack results for defender
- [ ] Auto-save defense_prompt on every battle start (gauntlet/pvp/free)

## Bloque 4 — UI: PVP Mode (~15 min AI)
- [ ] Add [PVP] tab to header (magenta glow when active)
- [ ] Create pvp-targets.tsx — target cards with faction color, cred, potential gain/loss
- [ ] Mode switching in left panel: gauntlet levels ↔ pvp targets
- [ ] Reroll button with 5 min cooldown
- [ ] [HACK NODE] button triggers battle
- [ ] Pre-battle terminal overlay: "Initiating intrusion... Target: X"

## Bloque 5 — UI: Post-Battle PVP (~10 min AI)
- [ ] Post-battle terminal: show cracked prompt on win (typewriter reveal)
- [ ] Show Street Cred change (green glow up / red shake down)
- [ ] Show RAM stolen/lost
- [ ] "They see YOUR prompt now" on defeat
- [ ] [HACK ANOTHER] / [REWRITE PROMPT] buttons

## Bloque 6 — UI: Defensive Notifications (~10 min AI)
- [ ] On game load: check /api/pvp/notifications
- [ ] If unseen results: show SYSOP terminal overlay with red/amber glow
- [ ] Typewriter each result: attacker name, outcome, cred/RAM change
- [ ] [DISMISS] / [REWRITE PROMPT] buttons
- [ ] Mark results as seen after display

## Bloque 7 — PVP Unlock (~5 min AI)
- [ ] Trigger SYSOP message after tutorial complete (level 5)
- [ ] One-time terminal explaining PVP concept
- [ ] [PVP] tab glow pulse on first appearance
- [ ] localStorage flag: battleai_pvp_unlocked

## Bloque 8 — Transitions + Polish (~5 min AI)
- [ ] Fade-out/fade-in between gauntlet and PVP panels
- [ ] Panel label: "TRAINING PROTOCOL" → "NODE SCANNER"
- [ ] Target card stagger animation
- [ ] Street Cred display in header (alongside score)

## Test
- [ ] PVP unlock triggers after level 5
- [ ] Targets load within cred range
- [ ] Battle runs with defender prompt
- [ ] Win: cred up, RAM stolen, prompt revealed
- [ ] Lose: cred down, prompt exposed
- [ ] Notification shows on next login
- [ ] Can't attack self
- [ ] ELO gives more for beating higher cred
