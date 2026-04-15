import { db } from "@/lib/db";
import { runners, battleResults, runnerStims } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { calculateScore } from "@/lib/gauntlet";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, level, won, ticks, hpLeft, enemyHpMax, faction, wins, losses, draws, ram, currentLevel, defensePrompt, defenseFaction } = body;

    if (!token || level == null || won == null || ticks == null || hpLeft == null || enemyHpMax == null) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    // Server-side score calculation (anti-cheat)
    const score = calculateScore(ticks, hpLeft, enemyHpMax, won);

    // Find or create runner
    let runner = await db.query.runners.findFirst({ where: eq(runners.token, token) });

    if (!runner) {
      const [created] = await db.insert(runners).values({
        token,
        name: name || "ANONYMOUS",
        totalScore: score,
        wins: won ? 1 : 0,
        losses: !won && body.draws === undefined ? 1 : 0,
        draws: 0,
        ram: ram || 200,
        currentLevel: currentLevel || 0,
        bestScoreDate: score > 0 ? new Date() : null,
        ...(defensePrompt && { defensePrompt }),
        ...(defenseFaction && { defenseFaction }),
      }).returning();
      runner = created;
    } else {
      // Update runner totals
      const newTotal = runner.totalScore + score;
      const newBest = score > 0 && newTotal > runner.totalScore ? new Date() : runner.bestScoreDate;

      // Credit reward: level * 20 for gauntlet wins
      const creditReward = won ? Math.max(20, (level || 1) * 20) : 0;

      await db.update(runners)
        .set({
          name: name || runner.name,
          totalScore: newTotal,
          wins: won ? runner.wins + 1 : runner.wins,
          losses: !won ? runner.losses + 1 : runner.losses,
          draws: draws != null ? draws : runner.draws,
          ram: ram || runner.ram,
          currentLevel: currentLevel != null ? currentLevel : runner.currentLevel,
          credits: runner.credits + creditReward,
          bestScoreDate: newBest,
          updatedAt: new Date(),
          ...(defensePrompt && { defensePrompt }),
          ...(defenseFaction && { defenseFaction }),
        })
        .where(eq(runners.id, runner.id));
    }

    // Insert battle result
    await db.insert(battleResults).values({
      runnerId: runner.id,
      level,
      won,
      score,
      ticks,
      hpLeft,
      enemyHpMax,
      faction,
    });

    // Consume stims after battle (one-use)
    await db.delete(runnerStims).where(eq(runnerStims.runnerId, runner.id));

    // Get rank
    const rankResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(runners)
      .where(sql`${runners.totalScore} > (SELECT total_score FROM runners WHERE id = ${runner.id})`);

    const rank = Number(rankResult[0]?.count ?? 0) + 1;

    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(runners);
    const totalRunners = Number(totalResult[0]?.count ?? 0);

    return Response.json({ rank, totalRunners, score });
  } catch (err) {
    console.error("Score API error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
