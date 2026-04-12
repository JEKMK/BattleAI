import { db } from "@/lib/db";
import { runners, pvpResults } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-runner-token");
    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 401 });
    }

    // Find the runner
    const runner = await db.query.runners.findFirst({
      where: eq(runners.token, token),
    });
    if (!runner) {
      return Response.json({ error: "Runner not found" }, { status: 404 });
    }

    // Get unseen pvp results where this runner was the defender
    const results = await db
      .select({
        id: pvpResults.id,
        attackerId: pvpResults.attackerId,
        attackerWon: pvpResults.attackerWon,
        defenderCredChange: pvpResults.defenderCredChange,
        ramTransferred: pvpResults.ramTransferred,
        ticks: pvpResults.ticks,
        createdAt: pvpResults.createdAt,
      })
      .from(pvpResults)
      .where(
        and(
          eq(pvpResults.defenderId, runner.id),
          eq(pvpResults.seenByDefender, false),
        ),
      )
      .orderBy(pvpResults.createdAt);

    // Get attacker names
    const notifications = [];
    for (const r of results) {
      const attacker = await db.query.runners.findFirst({
        where: eq(runners.id, r.attackerId),
        columns: { name: true },
      });
      notifications.push({
        id: r.id,
        attackerName: attacker?.name || "UNKNOWN",
        attackerWon: r.attackerWon,
        credChange: r.defenderCredChange,
        ramLost: r.attackerWon ? r.ramTransferred : 0,
        ticks: r.ticks,
        createdAt: r.createdAt.toISOString(),
      });
    }

    // Mark all as seen
    if (results.length > 0) {
      await db.update(pvpResults)
        .set({ seenByDefender: true })
        .where(
          and(
            eq(pvpResults.defenderId, runner.id),
            eq(pvpResults.seenByDefender, false),
          ),
        );
    }

    return Response.json({
      results: notifications,
      streetCred: runner.streetCred,
    });
  } catch (err) {
    console.error("PVP notifications error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
