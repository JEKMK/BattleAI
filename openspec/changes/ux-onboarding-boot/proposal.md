# UX Onboarding & Boot Sequence

## User Value Anchor
New users land on BattleIA and don't understand what they're looking at. This change replaces a generic 5-step modal with an immersive in-universe terminal onboarding and a cinematic boot sequence that makes the first battle feel like jacking into the matrix.

## User Stories
- As a new visitor, I want to immediately understand what BattleIA is so I don't bounce in confusion
- As a new player, I want to feel like a cyberpunk runner from the first second so I'm emotionally invested before my first fight
- As a returning player, I want the boot sequence to feel snappy so it doesn't slow me down

## What
1. **SYSOP Terminal Onboarding** — Replace empty arena state with a green phosphor terminal where SYSOP addresses the user as a runner. 6-8 lines of fast typewriter text explaining: you write the prompt, your AI fights alone, RAM is limited, 10 levels, nobody's cleared them all. The textarea is the natural continuation.

2. **2advanced-style Boot Sequence** — When the user hits FIGHT for the first time: blackout → boot lines → staggered UI flicker-in with CRT effects. Full sequence (~2.5s) on first battle, short flicker (400ms) on subsequent battles.

3. **Delete 5-step modal** — Remove the Onboarding component created earlier (wrong approach).

## Scope
- First-time user experience only (localStorage flags)
- No new API calls — purely client-side
- No sound (future consideration)
