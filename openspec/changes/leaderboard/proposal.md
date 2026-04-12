# Proposal: Leaderboard & Runner Persistence

## User value anchor
Players complete the gauntlet and their progress vanishes when they clear localStorage. A persistent leaderboard gives them a reason to compete, return, and share. "I'm #7 on the BattleIA leaderboard" is free marketing.

## User stories
- As a runner, I want to see my rank among all players so I feel competitive
- As a runner, I want my score to persist across devices/browsers so I don't lose progress
- As a new visitor, I want to see a leaderboard so I understand the game has real players
- As a runner, I want to link my email/Google later to protect my progress (future)

## Scope — NOW (contest deadline)
- Neon Postgres via Vercel Marketplace + Drizzle ORM
- Anonymous identity via UUID token (no auth required to play)
- Server-side score calculation (anti-cheat)
- Score sync after each battle
- `/leaderboard` page with global ranking
- Runner stats: name, total score, W/D/L, RAM, best score date, current level

## Scope — LATER (post-contest)
- Auth (Google/email) to "claim" anonymous token
- Runner XP / rank titles / prestige system
- Battle history / replay data
- Runner profile page (`/runner/[name]`)
- Real-time leaderboard updates via Neon websockets

## What this enables
The `runners` + `battle_results` schema is the foundation for ALL future progression: XP, unlocks, matchmaking, PvP rankings. We build it right once, extend forever.

## Status: in-progress
