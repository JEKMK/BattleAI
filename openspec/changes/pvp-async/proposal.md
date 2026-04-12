# Proposal: Async PVP — Hack Other Runners' Nodes

## User value anchor
Your prompt stops being disposable and becomes your most valuable asset. It defends your node 24/7. Other runners can hack you while you're offline. You hack them back. The loop: write prompt → defend → get hacked → rewrite → revenge. This is what makes people open the game every day.

## User stories
- As a runner, I want to hack other runners' nodes so I can steal their RAM and climb the rankings
- As a runner, I want my prompt to defend my node automatically so my progress is protected when I'm offline
- As a runner, I want to see who hacked me and what happened so I can learn and adapt
- As a runner, I want to choose my target from a list so I can pick fights strategically
- As a runner, I want to see the risk/reward before attacking so I can make informed decisions

## Core mechanic: Street Cred (ELO)
- New stat separate from Score. Starts at 1000.
- Goes UP when you win PVP attacks
- Goes DOWN when you lose attacks OR get hacked
- Asymmetric gains (League of Legends LP model):
  - Beat someone with higher cred → big gain, small loss risk
  - Beat someone with lower cred → small gain, big loss risk
  - This naturally prevents farming weak players

## PVP flow
1. Player clicks [PVP] tab in header
2. Panel shows 3 targets within ±200 of their Street Cred
3. Each target shows: name, faction, cred, W/L, potential cred gain
4. Player clicks [HACK NODE] → battle streams live (same engine)
5. Win: steal RAM + gain Street Cred + see enemy prompt
6. Lose: lose Street Cred + enemy sees YOUR prompt

## Defensive notifications
- When a runner opens the game after being hacked:
  - SYSOP terminal overlay: "INTRUSION DETECTED"
  - Shows who attacked, result, cred/RAM change
  - [REWRITE PROMPT] button → focuses prompt textarea
  - [DISMISS] to continue

## What changes
- New header tab: [PVP] alongside [GAUNTLET] [FREE]
- Panel left: target cards replace level cards in PVP mode
- Same arena, same combat log, same engine — battle is identical
- Post-battle terminal: shows cracked prompt on win, cred change
- Login notification: pending hack results

## Scope — NOW
- Street Cred system (ELO with asymmetric gains)
- Target selection (3 opponents within cred range, reroll)
- PVP battles using existing engine (attacker prompt vs defender prompt)
- Win/lose consequences: RAM transfer + cred change + prompt reveal
- Defensive notifications on game load
- DB: street_cred column on runners, pvp_results table
- Unlock after tutorial complete (level 5)

## Scope — LATER
- Revenge system ("CIPHER hacked you → [HACK BACK]")
- PVP battle history log
- Defensive prompt (separate from attack prompt)
- Shield period after being hacked (cooldown protection)
- Seasonal cred resets

## Status: proposed
