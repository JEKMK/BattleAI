import { db } from "@/lib/db";
import { runners, runnerImplants, runnerStims } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { IMPLANTS, STIMS } from "@/lib/implants";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-runner-token");
    if (!token) return Response.json({ error: "Missing token" }, { status: 401 });

    const runner = await db.query.runners.findFirst({ where: eq(runners.token, token) });
    if (!runner) return Response.json({ error: "Runner not found" }, { status: 404 });

    const equipped = await db.select().from(runnerImplants).where(eq(runnerImplants.runnerId, runner.id));
    const activeStims = await db.select().from(runnerStims).where(eq(runnerStims.runnerId, runner.id));

    const equippedIds = new Set(equipped.map((e) => e.implantId));
    const activeStimIds = new Set(activeStims.map((s) => s.stimId));

    const implants = Object.values(IMPLANTS).map((i) => ({
      ...i,
      owned: equippedIds.has(i.id),
      canAfford: runner.credits >= i.cost,
    }));

    const stims = Object.values(STIMS).map((s) => ({
      ...s,
      active: activeStimIds.has(s.id),
      canAfford: runner.credits >= s.cost,
    }));

    return Response.json({ implants, stims, credits: runner.credits });
  } catch (err) {
    console.error("Stock error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
