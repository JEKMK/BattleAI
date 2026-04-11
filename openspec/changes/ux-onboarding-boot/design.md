# Design: UX Onboarding & Boot Sequence

## SYSOP Terminal Onboarding

**Where:** Replaces the arena canvas area when no battle has been fought yet (first visit).
**Tech:** React component with fast typewriter effect (40ms/char, ~3s total). Click anywhere to skip.
**Copy:** English, 7 lines max. Identity (runner) → mechanic (prompt = weapon) → constraint (RAM) → FOMO (10 levels, nobody cleared) → competition.
**Transition:** Textarea and faction picker remain visible below. SYSOP terminal IS the empty state.
**Persistence:** `localStorage.battleai_onboarding_done` — set on first FIGHT, never show again.
**Lore link:** Subtle `[FULL TRANSMISSION]` link to `/lore` at bottom.

## Boot Sequence (2advanced-style)

**Trigger:** First FIGHT click only (`localStorage.battleai_first_boot`).
**Phases:**
1. Blackout (500ms) — full black, terminal fades out
2. Boot lines (800ms) — 5-6 fast terminal lines with dynamic content (faction, level name)
3. UI flicker in (1200ms) — staggered panel reveal with Framer Motion
   - Arena: delay 0ms, flicker animation (opacity [0,0.3,0,0.7,0,1] over 400ms) + glow surge
   - Combat log: delay 200ms, same flicker
   - Stats/header: delay 400ms
4. Battle starts — ticks begin

**Subsequent battles:** Short flicker (400ms), no blackout, no boot lines.

**Framer Motion variants:**
- `flickerIn`: keyframes opacity with stagger
- `glowSurge`: boxShadow pulse on entry

## Files Modified
- `src/components/onboarding.tsx` — DELETE (replace with terminal)
- `src/components/sysop-terminal.tsx` — NEW (onboarding terminal)  
- `src/components/boot-sequence.tsx` — NEW (boot animation)
- `src/app/page.tsx` — Wire up terminal + boot, remove old Onboarding
- `src/app/globals.css` — Boot animation keyframes if needed
