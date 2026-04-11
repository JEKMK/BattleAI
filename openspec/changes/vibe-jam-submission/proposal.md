# Vibe Jam 2026 Submission

## User Value Anchor
BattleIA needs to meet Vibe Jam 2026 requirements by May 1, 13:37 UTC. The game must be free-to-play, instantly playable (no loading screens), mobile ready, and accessible without login. Currently fails on: token cost, slow onboarding, desktop-only layout, missing widget/portal.

## User Stories
- As a Vibe Jam judge, I want to open the game URL and be playing within 3 seconds so I don't skip it
- As a mobile player, I want the game to work on my phone so I can play anywhere
- As a portal traveler, I want to arrive from another game and instantly be in a battle
- As a free player, I want to play without paying so I can evaluate the game

## What

### 1. Free tier (A+B model)
- 20 free battles stored in localStorage counter
- After 20: show "FREE RUNS EXHAUSTED" with option to continue (future: payment)
- During jam: absorb all costs. Free tier is the safety net for post-jam
- Cost per battle ~$0.001-0.003 with gemini-flash

### 2. Instant start / fast onboarding
- **Returning users**: straight to game UI, no onboarding, <1s
- **Portal users** (`?portal=true`): extract `username` from params, skip ALL onboarding, go straight to auto-battle level 1 or current level
- **First visit (no portal)**: shortened onboarding — skip connecting animation, faster typewriter (15ms), skip post-name typewriter, just name → confirm → go. Target: <8 seconds total
- **First visit (jam mode)**: if `?portal=true` not set but jam period active, still make it fast

### 3. Mobile responsive
- Stack layout vertical on mobile: prompt on top, arena center, log below
- Hide right panel (combat log) behind toggle on mobile
- Touch-friendly: larger buttons, no hover-dependent UI
- Arena scales to viewport width

### 4. Vibe Jam widget
- Add `<script async src="https://jam.pieter.com/2026/widget.js"></script>` to HTML head

### 5. Portal integration
- **Exit portal**: after battle ends, show "VIBE JAM PORTAL" button/link that redirects to `https://jam.pieter.com/portal/2026` with query params (username, ref, hp)
- **Start portal**: detect `?portal=true` in URL, extract username/color/ref params, skip onboarding, auto-start first available level
- **Return portal**: if `?ref=` present, show portal back to referring game

### 6. Custom domain
- Register or configure domain for Vercel deployment
- Required for jam tracking (games tracked by domain)

## Scope
- Deadline: May 1, 2026 @ 13:37 UTC
- No new game mechanics — only jam compliance
- No multiplayer (not required, "preferred" only)
- No 3D — canvas 2D is allowed ("any engine")
- No auth/login — anonymous play with localStorage
