# Tasks: UX Onboarding & Boot Sequence

- [x] Delete old `src/components/onboarding.tsx` modal and remove import/usage from `page.tsx`
- [x] Create `src/components/sysop-terminal.tsx` — SYSOP onboarding terminal with fast typewriter, click-to-skip, lore link
- [x] Integrate SYSOP terminal into `page.tsx` as arena empty state (shows when no battle + first visit)
- [x] Create `src/components/boot-sequence.tsx` — blackout → boot lines → staggered flicker-in
- [x] Integrate boot sequence into `page.tsx` — triggers on first FIGHT, short flicker on subsequent
- [x] Add CSS keyframes for flicker/glow animations in `globals.css` if needed
- [x] Test: build passes, flow verified in code review
