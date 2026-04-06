# Tasks: Progressive Tutorial

## Engine
- [x] Add `allowedActions` param to `resolveTick` — filter disallowed actions to "none"
- [x] Create `buildSystemRules(allowedActions)` — dynamic rules generator
- [x] Add `availableActions` field to `buildTickInput` JSON output
- [x] Update `BattleConfig` / types to support arena size + HP overrides per level

## Gauntlet data
- [x] Add new fields to `GauntletLevel` interface (isTutorial, allowedActions, arenaWidth/Height, playerHp, preHint, unlockMessage)
- [x] Create 5 tutorial levels (0-4) with progressive action unlocks
- [x] Renumber existing gauntlet levels 1-10 → 6-15
- [x] Update `INITIAL_GAUNTLET` — start with only move+punch unlocked

## Battle API
- [x] Pass `allowedActions` + arena size overrides from gauntlet level to engine
- [x] Use dynamic `buildSystemRules` instead of static `SYSTEM_RULES`

## UI — Pre-battle hints
- [x] Show SYSOP pre-hint in left panel above JACK IN for tutorial levels
- [x] Show unlock message after winning a tutorial level ("NEW: You unlocked SPIKE!")

## UI — Tutorial gate
- [x] Hide gauntlet levels 6+ until tutorial complete (localStorage flag)
- [x] Show "LOCKED — Complete training" for hidden levels
- [x] After tutorial complete, unlock all and set flag

## UI — Simplified combat log
- [ ] Add `simplifiedLog` mode to combat-log component
- [ ] Tutorial levels use simplified format: "[P] BURN -2 → [Bot 4/6]"
- [ ] Full lore log unlocks after tutorial

## SYSOP — Prompt analysis
- [ ] Update SYSOP API prompt to include player's prompt text
- [ ] Add instruction: analyze prompt → behavior mapping, give 1 concrete tip
- [ ] Tutorial SYSOP reports focus on teaching, not just narration

## Test
- [ ] Fresh playthrough: tutorial levels appear, actions restricted correctly
- [ ] Engine rejects disallowed actions gracefully
- [ ] Post-tutorial: full gauntlet unlocks
- [ ] Returning player: tutorial complete flag skips to full gauntlet
