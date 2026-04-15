# Tasks: Interactive Onboarding

## Terminal rewrite
- [x] New phase "explain": SYSOP explains game in 3 lines with example prompt
- [x] New phase "choice": W/H keyboard input for write-own vs help
- [x] New phase "write": sarcastic line → dismiss terminal
- [x] New phase "help": SYSOP typewriters basic prompt
- [x] New phase "helpConfirm": Y/n to use helped prompt
- [x] Keep boot phase (fast code scroll)
- [x] Keep returning user flow (Jack in? Y/n)
- [x] Keep portal skip (?portal=true)
- [x] Update onDismiss to pass mode + prompt

## Page integration
- [x] Handle mode="write": show UI, empty textarea focused, spotlight
- [x] Handle mode="helped": fill textarea with SYSOP prompt, auto-start first battle
- [x] Move name input to post-first-battle (show after battle ends if no name)
- [x] Remove old name-related quickMode logic

## Test
- [x] Fresh user: sees explain → choice → write or help → battle starts
- [x] Returning user: sees Jack in? → straight to game
- [x] Portal user: skips everything
- [ ] Mobile: flow works on small screen
