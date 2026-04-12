# Design: Zaibatsu War

## It's one query

```sql
SELECT 
  faction,
  COUNT(*) FILTER (WHERE won = true) AS wins,
  COUNT(*) FILTER (WHERE won = false) AS losses,
  SUM(score) FILTER (WHERE won = true) AS total_score,
  COUNT(DISTINCT runner_id) AS runners
FROM battle_results
GROUP BY faction
ORDER BY total_score DESC;
```

Same query works for pvp_results when PVP ships. Union both tables.

## API

### GET /api/zaibatsu
```typescript
{
  factions: [
    {
      faction: "anthropic";
      wins: number;
      losses: number;
      totalScore: number;
      runners: number;
      winRate: number;  // calculated
    }
  ]
}
```

## UI: Section in leaderboard overlay

```
┌─────────────────────────────────────────────────┐
│ ZAIBATSU WAR                                     │
│                                                  │
│  #1  ANTHROPIC   234,500 pts   67% win   12 rnrs│
│  ██████████████████████████████████░░░░░░░░░░░░  │
│                                                  │
│  #2  GOOGLE      198,200 pts   61% win    9 rnrs│
│  ████████████████████████████░░░░░░░░░░░░░░░░░░  │
│                                                  │
│  #3  OPENAI      187,100 pts   58% win   11 rnrs│
│  ██████████████████████████░░░░░░░░░░░░░░░░░░░░  │
│                                                  │
│  Your zaibatsu: ANTHROPIC                        │
└─────────────────────────────────────────────────┘
```

- Progress bars use faction colors (already defined as CSS vars)
- Bar width = percentage of total score across all factions
- "Your zaibatsu" highlighted based on runner's current faction
- Placed ABOVE the individual runner rankings in the leaderboard overlay

## Files to create
- `src/app/api/zaibatsu/route.ts` — aggregate query
- `src/components/zaibatsu-war.tsx` — faction ranking display

## Files to modify
- `src/components/leaderboard-terminal.tsx` — add zaibatsu section at top
