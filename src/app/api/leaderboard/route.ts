import { db } from "@/lib/db";
import { runners } from "@/lib/db/schema";
import { desc, sql, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-runner-token");

    // Top 100 runners
    const top = await db
      .select({
        name: runners.name,
        totalScore: runners.totalScore,
        wins: runners.wins,
        losses: runners.losses,
        draws: runners.draws,
        ram: runners.ram,
        credits: runners.credits,
        currentLevel: runners.currentLevel,
        bestScoreDate: runners.bestScoreDate,
      })
      .from(runners)
      .where(sql`${runners.totalScore} > 0`)
      .orderBy(desc(runners.totalScore))
      .limit(100);

    const ranked = top.map((r, i) => ({ rank: i + 1, ...r }));

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(runners).where(sql`${runners.totalScore} > 0`);
    const total = Number(totalResult[0]?.count ?? 0);

    // My rank (if token provided)
    let myRank: number | undefined;
    if (token) {
      const me = await db.query.runners.findFirst({ where: eq(runners.token, token) });
      if (me && me.totalScore > 0) {
        const above = await db
          .select({ count: sql<number>`count(*)` })
          .from(runners)
          .where(sql`${runners.totalScore} > ${me.totalScore}`);
        myRank = Number(above[0]?.count ?? 0) + 1;
      }
    }

    return Response.json({ runners: ranked, total, myRank });
  } catch (err) {
    console.error("Leaderboard API error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
