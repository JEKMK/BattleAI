import { db } from "@/lib/db";
import { runners } from "@/lib/db/schema";
import { eq, and, between, ne, sql } from "drizzle-orm";
import { calculatePotentials } from "@/lib/pvp";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-runner-token");
    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 401 });
    }

    // Find the attacker runner
    const runner = await db.query.runners.findFirst({
      where: eq(runners.token, token),
    });

    if (!runner) {
      return Response.json({ error: "Runner not found" }, { status: 404 });
    }

    const myCred = runner.streetCred;
    const range = 200;

    // Find 3 random targets within cred range, excluding self
    const targets = await db
      .select({
        id: runners.id,
        name: runners.name,
        faction: runners.defenseFaction,
        streetCred: runners.streetCred,
        pvpWins: runners.pvpWins,
        pvpLosses: runners.pvpLosses,
      })
      .from(runners)
      .where(
        and(
          ne(runners.id, runner.id),
          between(runners.streetCred, myCred - range, myCred + range),
          // Only target runners who have a defense prompt (have played at least once)
          sql`${runners.defensePrompt} IS NOT NULL`,
        ),
      )
      .orderBy(sql`random()`)
      .limit(3);

    // Pre-calculate potential gains/losses
    const targetsWithPotentials = targets.map((t) => {
      const { potentialCredGain, potentialCredLoss } = calculatePotentials(myCred, t.streetCred);
      return {
        ...t,
        potentialCredGain,
        potentialCredLoss,
      };
    });

    return Response.json({
      targets: targetsWithPotentials,
      myCred,
    });
  } catch (err) {
    console.error("PVP targets error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
