import { db } from "@/lib/db";
import { battleResults } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        faction: battleResults.faction,
        wins: sql<number>`count(*) filter (where ${battleResults.won} = true)`,
        losses: sql<number>`count(*) filter (where ${battleResults.won} = false)`,
        totalScore: sql<number>`coalesce(sum(${battleResults.score}) filter (where ${battleResults.won} = true), 0)`,
        runners: sql<number>`count(distinct ${battleResults.runnerId})`,
      })
      .from(battleResults)
      .groupBy(battleResults.faction);

    const factions = rows.map((r) => ({
      faction: r.faction,
      wins: Number(r.wins),
      losses: Number(r.losses),
      totalScore: Number(r.totalScore),
      runners: Number(r.runners),
      winRate: (Number(r.wins) + Number(r.losses)) > 0
        ? Math.round((Number(r.wins) / (Number(r.wins) + Number(r.losses))) * 100)
        : 0,
    })).sort((a, b) => b.totalScore - a.totalScore);

    return Response.json({ factions });
  } catch (err) {
    console.error("Zaibatsu API error:", err);
    return Response.json({ factions: [] });
  }
}
