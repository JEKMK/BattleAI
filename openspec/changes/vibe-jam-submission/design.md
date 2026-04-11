# Design: Vibe Jam 2026 Submission

## Free tier

### localStorage counter
```
battleai_free_battles: number (default 0, increments after each battle)
```
- Check before starting battle. If >= 20, show modal: "FREE RUNS EXHAUSTED — 20/20 used"
- Show remaining count in header: "FREE: 17/20"
- During jam period: no hard block (absorb cost). Counter still tracks for analytics
- Post-jam: hard block at 20, show payment CTA

### Cost control
- Tutorial levels could use cheaper/shorter battles (fewer ticks, smaller arena = fewer API calls)
- Gemini Flash is ~$0.001/battle. 20 free = ~$0.02/user. 1000 users = $20. Acceptable.

## Instant start

### URL param detection (in page.tsx useEffect)
```ts
const params = new URLSearchParams(window.location.search);
const isPortal = params.get("portal") === "true";
const portalUsername = params.get("username");
const portalRef = params.get("ref");
```

### Fast paths
| Entry type | Onboarding | Time to play |
|-----------|------------|-------------|
| Portal (`?portal=true`) | NONE — auto-start current level | <1s |
| Returning user (localStorage) | NONE — show UI | <1s |
| First visit (jam) | Quick: name input only, no typewriter | <5s |

### Portal auto-start
When `?portal=true`:
1. Set runner name from `?username` param (or "RUNNER")
2. Skip onboarding entirely
3. Auto-start current gauntlet level after 1s delay (let UI render)
4. Save runner to localStorage for future visits

## Mobile responsive

### Breakpoint strategy
- `>= 1024px` (lg): current 3-column layout
- `< 1024px` (md): 2 columns — left panel + center, log hidden behind toggle
- `< 640px` (sm): single column — stacked vertically

### Layout on mobile (sm)
```
┌─────────────────────┐
│ Header (compact)    │
├─────────────────────┤
│ Arena (full width)  │
│ HP bars             │
├─────────────────────┤
│ Prompt textarea     │
│ Faction picker      │
│ JACK IN button      │
├─────────────────────┤
│ [LOG] toggle button │
│ (expandable)        │
└─────────────────────┘
```

### Arena scaling
Canvas width = `min(viewport_width - padding, 446px)`. Cell size scales proportionally.
Use CSS `max-width: 100%` on canvas with `width: auto`.

## Widget
In `src/app/layout.tsx`, add to `<head>`:
```html
<script async src="https://jam.pieter.com/2026/widget.js"></script>
```

## Portal integration

### Exit portal
After battle ends (win/lose/draw), show alongside SYSOP report:
```
┌──────────────────────────────┐
│ ◈ VIBE JAM PORTAL           │
│ Travel to the next game →    │
└──────────────────────────────┘
```
Links to: `https://jam.pieter.com/portal/2026?username={name}&ref={our_domain}&hp={hp_percent}`

### Start portal
When `?portal=true` detected:
- Extract all params
- If `?ref=` present, store it — show "Return to {ref}" portal after battle
- Skip all onboarding
- Set name, start playing

## Files to modify
- `src/app/layout.tsx` — widget script
- `src/app/page.tsx` — free tier counter, portal params, fast start, mobile layout, exit portal
- `src/components/sysop-terminal.tsx` — quick mode (no typewriter)
- `src/components/arena.tsx` — responsive canvas sizing
- `src/components/combat-log.tsx` — collapsible on mobile
- `vercel.json` — custom domain config if needed
