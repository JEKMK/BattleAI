# Progressive Tutorial — Mario-style Onboarding

## User Value Anchor
New players don't understand what BattleIA is, what their prompt does, or how to improve. The game dumps 6 actions, 5 movements, cooldowns, firewall shrink, and parry combos on the player at level 1. Result: confusion, no sense of agency, bounce. This change introduces mechanics ONE at a time across 5 tutorial levels that must be completed before accessing the full gauntlet.

## User Stories
- As a new player, I want to learn one mechanic at a time so I understand what each action does before facing harder enemies
- As a new player, I want to SEE how my prompt affected the battle so I learn to write better prompts
- As a new player, I want SYSOP to tell me what I'm about to face so I can plan my prompt
- As a returning player, I want to skip tutorials I've already completed and go straight to where I left off

## What

### 1. Engine: action filtering
`resolveTick` receives `allowedActions` — any action not in the list becomes "none". Guarantees tutorial integrity regardless of what the LLM tries.

### 2. Dynamic SYSTEM_RULES
Instead of sending ALL rules every tick, generate rules based on level's allowed actions. Level 0 only describes move + punch. Level 2 adds shoot. Etc.

### 3. Tutorial levels (0-4) before existing gauntlet
Five mandatory tutorial levels that each introduce ONE mechanic:

| Level | Name | Unlocks | Arena | Player HP | Bot HP | Bot behavior |
|-------|------|---------|-------|-----------|--------|-------------|
| 0 | BOOT_CAMP | move + punch | 6x4 | 8 | 4 | walks toward you, punches |
| 1 | SIGNAL_RANGE | shoot | 8x6 | 8 | 6 | walks toward you, punches (you have range advantage) |
| 2 | FIREWALL_101 | block | 8x6 | 8 | 8 | shoots from distance (you need block) |
| 3 | OVERCLOCK | heavy | 10x8 | 10 | 8 | blocks a lot (you need heavy to break through) |
| 4 | GHOST_PROTOCOL | dodge | 10x8 | 10 | 10 | heavy aggro (you need dodge to survive) |

After tutorial: parry unlocks at gauntlet level 3 (existing). Full gauntlet is levels 5-14 (renumbered from current 1-10).

### 4. Pre-battle SYSOP hints
Before each tutorial level, SYSOP terminal shows a 2-3 line hint about what's coming and what the new mechanic does. Not a wall of text — one concept.

### 5. Post-battle prompt analysis
After each battle, a "WHAT YOUR PROMPT DID" section maps the player's prompt text to actual construct behavior: action distribution, whether the new mechanic was used, specific tip for improvement.

### 6. Simplified combat log during tutorials
Tutorial levels show a SIMPLIFIED log: just "[P] BURN -2" / "[B] BURN -1" style. No lore flavor text. Full cyberpunk log unlocks after tutorials.

## Scope
- Tutorial is mandatory on first playthrough (localStorage flag)
- Existing gauntlet levels renumber (current 1-10 become 6-15)
- Engine gets `allowedActions` parameter (backwards compatible — undefined = all allowed)
- No new API endpoints needed
- SYSOP report prompt updated to include prompt analysis
- All client-side, no backend changes except SYSOP prompt tweak
