# Tasks: Vibe Jam 2026 Submission

## Bloque 1 — Ship Blockers (~20 min AI)
- [x] Free tier: localStorage battle counter, show remaining in header, block at 20 with message
- [x] Widget: add jam.pieter.com widget script to layout.tsx head
- [x] Portal start: detect ?portal=true, extract username/ref, skip onboarding, auto-start
- [x] Fast onboarding: first visit without portal — name input only, no typewriter, <5s to play
- [x] Return portal: if ?ref= present, show "Return to {ref}" link after battle

## Bloque 2 — Mobile (~25 min AI)
- [ ] Responsive layout: stack panels vertically on mobile (<640px)
- [ ] Compact header for mobile
- [ ] Arena canvas responsive: scale to viewport width
- [ ] Combat log: collapsible toggle on mobile, hidden by default
- [ ] Touch-friendly: larger tap targets for buttons and faction picker

## Bloque 3 — Portal (~10 min AI)
- [ ] Exit portal: "VIBE JAM PORTAL" button after battle with username/ref/hp params
- [ ] Portal landing: when ?portal=true, smooth instant entry (no black screen flash)

## Bloque 4 — Polish (~15 min AI)
- [ ] Custom domain: configure in Vercel (needs Kilian to confirm domain)
- [ ] Screenshot: take a good one for submission
- [ ] Test mobile on real device
- [ ] Test portal flow (simulate ?portal=true)
- [ ] Fill submission form
