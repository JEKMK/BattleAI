# Proposal: Zaibatsu War — Global Faction Ranking

## User value anchor
Your faction choice stops being cosmetic. Every battle you win adds to your zaibatsu's global war score. Players feel tribal loyalty. "Anthropic is winning the war" creates conversation and competition between faction communities.

## User stories
- As a runner, I want to see which zaibatsu is winning globally so my faction choice feels meaningful
- As a runner, I want my victories to contribute to my faction's total so I feel part of something bigger
- As a visitor, I want to see the faction war so I understand the game has an active meta-game

## Scope — NOW
- Aggregate wins, total score, and battle count per faction from existing battle_results + pvp_results
- Display in leaderboard overlay as a section above individual rankings
- Include gauntlet AND PVP results
- Real-time (query on load, no caching needed at this scale)

## Scope — LATER
- Faction-specific rewards/bonuses for the winning zaibatsu
- Weekly/monthly war resets with winner announcement
- Faction chat/community features
- Territory conquest (multiple nodes per faction)

## Status: proposed
