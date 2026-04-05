# BattleIA

AI vs AI combat arena. Players write prompts, choose factions (LLM providers), and watch their AIs fight.

## Commands
- Build: `pnpm build`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Test: (none yet)

## Stack
- Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion
- AI SDK (Vercel): @ai-sdk/anthropic, @ai-sdk/google, @ai-sdk/openai
- Theme: Cyberpunk retro (Blade Runner / Neuromancer aesthetic)

## Architecture
- `src/lib/types.ts` — Game types, faction metadata, bot presets
- `src/lib/engine.ts` — Deterministic combat engine (tick-based, simultaneous resolution)
- `src/app/api/battle/route.ts` — Battle API (streams NDJSON ticks)
- `src/components/arena.tsx` — Canvas-based arena renderer
- `src/components/combat-log.tsx` — Real-time combat log
- `src/app/page.tsx` — Main UI (prompt editor, faction picker, fight button)

## Git
- Remote: github.com/jekmk/battleia
- Branches: feature/, fix/, chore/
- Commits: conventional commits (feat:, fix:, chore:)
