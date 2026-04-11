# Interactive Onboarding — SYSOP teaches through dialogue

## User Value Anchor
50 visits, 1 battle = 2% conversion. Players arrive, see a terminal asking for their name, don't understand the game, and leave. The onboarding needs to TEACH the core mechanic (write a prompt for your AI) through interaction, not text walls.

## User Stories
- As a new player, I want to understand what I'm supposed to DO within 10 seconds
- As a new player, I want to see an example prompt so I know what "write instructions" means
- As a new player, I want the option to get help if I don't know what to write
- As a returning player, I want to skip all this and go straight to the game

## What

### 1. Replace current onboarding terminal with interactive SYSOP dialogue

SYSOP explains the game in 2-3 lines max, gives a concrete example, then asks if the player can write their own or needs help:

```
SYSOP> You're a runner now. Your job: write orders for your AI fighter.
       It reads your instructions. It fights alone. You watch.

SYSOP> Example: "Move toward enemy. Punch when close. Block if low HP."

SYSOP> Think you can write your own combat orders?
       Or does SYSOP need to hold your hand?

> (W) Write my own  /  (H) Help me
```

### 2. Two paths after choice

**Path W — "Write my own":**
- SYSOP: sarcastic encouragement
- Terminal closes → GUI appears with EMPTY textarea focused
- Player writes → hits FIGHT → first tutorial battle starts

**Path H — "Help me":**
- SYSOP writes a basic prompt with typewriter effect:
  `"Move toward the enemy and attack. Block when HP is low."`
- SYSOP: "This is garbage, but it'll keep you alive. Use it?"
- `> (Y/n)`
- If Y → prompt auto-fills into textarea → first battle AUTO-STARTS
- If N → goes to Write path with empty textarea

### 3. Name asked AFTER first battle, not before
- After first battle ends, SYSOP: "Not bad for someone with no name. What do they call you, runner?"
- Reduces friction — play first, identity later

### 4. Portal users unchanged
- `?portal=true` skips everything, instant play (already working)

### 5. Returning users
- If localStorage has runner data, skip to `> Jack in? (Y/n)` (already working)

## Scope
- Rewrite sysop-terminal.tsx onboarding flow
- Move name input to post-first-battle
- Keep all existing features (portal, returning user, boot sequence)
- No backend changes
