# Proposal: AI Transparency + Context as RPG Stat

## User value anchor
Players don't understand why their AI makes bad decisions. They can't improve their prompt because they can't see what the AI saw, what it decided, or how much it remembered. Context Memory as a purchasable stat makes the AI's "intelligence" tangible, visible, and upgradeable — like leveling up a Pokémon that finally starts obeying you.

## User stories
- As a runner, I want to see what my AI decided each tick so I understand its behavior
- As a runner, I want to know how much context my AI had so I understand why it's "dumb"
- As a runner, I want to upgrade my AI's memory so it can detect patterns and be smarter
- As a runner, I want an adherence score after battle so I know if my prompt worked
- As a new player, I want to understand the tick cycle so I know what's happening

## Core mechanic: Context Memory

Context starts at 0 — your AI is blind. It only sees the current tick state. No history. Upgrade to give it memory of past ticks.

| Level | Ticks | Name | Cost | Effect |
|-------|-------|------|------|--------|
| 0 | 0 | AMNESIAC | Free | AI sees only current tick. No patterns. |
| 1 | 5 | SHORT-TERM | ¤100 | AI remembers last 5 actions. Basic reactions. |
| 2 | 10 | TACTICAL | ¤200 | AI detects simple patterns (block-punch cycles). |
| 3 | 20 | STRATEGIC | ¤350 | AI plans multi-tick combos. Reads rhythm. |
| 4 | 35 | DEEP MEMORY | ¤500 | AI adapts to opponent strategy mid-fight. |
| 5 | 50 | TOTAL RECALL | ¤800 | Full battle awareness. Maximum intelligence. |

## Scope — NOW
- Context Memory stat on runners (DB + localStorage)
- Variable history window in buildTickInput() (replaces hardcoded 10)
- Context Memory buyable at RipperDoc (new "OS" category)
- AI Decision visible in combat log (move + action per tick)
- Context meter visible in cockpit during battle
- Adherence score in post-battle SYSOP report

## Scope — LATER
- Detailed tick-by-tick replay with AI reasoning
- Onboarding: animated tick cycle explanation
- Context Memory affects PVP matchmaking weight

## Status: proposed
