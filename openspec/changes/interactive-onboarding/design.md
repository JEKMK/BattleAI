# Design: Interactive Onboarding

## Terminal phases (new)

```
"boot" → "explain" → "choice" → "help" → "confirm" → DONE
                        │
                        └→ "write" → DONE
```

### Phase: boot (existing)
Fast code scroll, unchanged. ~0.7s.

### Phase: explain (NEW — replaces intro/name)
SYSOP typewriters 3 lines:
1. What you are + what you do
2. A concrete example prompt
3. The challenge/question

All at 18ms/char. Total ~4 seconds.

### Phase: choice (NEW)
Terminal prompt: `> (W) Write my own / (H) Help me`
Player presses W or H (or types and Enter).

### Phase: write (if W)
SYSOP: one sarcastic line → dismiss terminal → GUI with empty textarea focused.
```
SYSOP> Good. The matrix needs runners, not tourists.
[terminal fades → game UI appears → textarea focused]
```

### Phase: help (if H)
SYSOP typewriters a basic prompt:
```
SYSOP> Fine. Here's something to keep you alive:

> "Move toward the enemy and attack. Block when HP is low."

SYSOP> It's terrible. But it works. Use it? (Y/n)
```

### Phase: confirm (after help)
`> (Y/n)` — Y fills prompt into game and auto-starts battle.
N goes to write path.

## Component changes

### sysop-terminal.tsx
- Remove: name input, quickMode text, post-name sequence
- Add: explain phase with new copy
- Add: choice phase (W/H keyboard input)
- Add: help phase with example prompt typewriter
- Add: confirm phase
- onDismiss signature changes: `(result: { mode: "write" | "helped", prompt?: string }) => void`

### page.tsx
- onDismiss handler:
  - If mode="write": show UI, focus textarea (empty), spotlight prompt
  - If mode="helped": fill textarea with SYSOP prompt, auto-start first battle
- Name input: move to post-battle flow
  - After first battle ends AND no runner name in localStorage:
    - Show small SYSOP prompt: "What do they call you?" in the center panel
    - After name entered: save to localStorage, show in header

## SYSOP copy

### Explain
```
SYSOP> You're a runner now. You write combat orders for your AI.
       It reads your prompt. It fights alone. You watch.
SYSOP> Like this: "Move toward enemy. Punch when close. Block if HP is low. Shoot from far."
SYSOP> Think you can write something better? Or need me to help?
```

### Choice
```
> (W) I'll write my own  /  (H) Help me, SYSOP
```

### Write response
```
SYSOP> Good. Don't embarrass me out there.
```

### Help prompt
```
"Move toward the enemy and attack when close. If HP drops below half, block and retreat. Shoot from distance."
```

### Help confirmation
```
SYSOP> Basic. Predictable. But it'll survive level 1. Barely. Use it?
> (Y/n)
```

## Files to modify
- `src/components/sysop-terminal.tsx` — full rewrite of flow
- `src/app/page.tsx` — new onDismiss handler, post-battle name input
