import { db } from "@/lib/db";
import { battleResults, runners, pvpResults } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Gauntlet stats from battle_results
    const gauntletRows = await db
      .select({
        faction: battleResults.faction,
        wins: sql<number>`count(*) filter (where ${battleResults.won} = true)`,
        losses: sql<number>`count(*) filter (where ${battleResults.won} = false)`,
        totalScore: sql<number>`coalesce(sum(${battleResults.score}) filter (where ${battleResults.won} = true), 0)`,
        runners: sql<number>`count(distinct ${battleResults.runnerId})`,
      })
      .from(battleResults)
      .groupBy(battleResults.faction);

    // PVP stats — count wins per attacker's faction
    const pvpRows = await db
      .select({
        faction: runners.defenseFaction,
        wins: sql<number>`count(*) filter (where ${pvpResults.attackerWon} = true)`,
        losses: sql<number>`count(*) filter (where ${pvpResults.attackerWon} = false)`,
      })
      .from(pvpResults)
      .innerJoin(runners, eq(pvpResults.attackerId, runners.id))
      .groupBy(runners.defenseFaction);

    // Merge gauntlet + PVP
    const merged: Record<string, { wins: number; losses: number; totalScore: number; runners: number }> = {};
    for (const r of gauntletRows) {
      merged[r.faction] = {
        wins: Number(r.wins),
        losses: Number(r.losses),
        totalScore: Number(r.totalScore),
        runners: Number(r.runners),
      };
    }
    for (const r of pvpRows) {
      if (!merged[r.faction]) merged[r.faction] = { wins: 0, losses: 0, totalScore: 0, runners: 0 };
      merged[r.faction].wins += Number(r.wins);
      merged[r.faction].losses += Number(r.losses);
    }

    const factions = Object.entries(merged).map(([faction, data]) => ({
      faction,
      ...data,
      winRate: (data.wins + data.losses) > 0
        ? Math.round((data.wins / (data.wins + data.losses)) * 100)
        : 0,
    })).sort((a, b) => b.totalScore - a.totalScore);

    return Response.json({ factions });
  } catch (err) {
    console.error("Zaibatsu API error:", err);
    return Response.json({ factions: [] });
  }
}
