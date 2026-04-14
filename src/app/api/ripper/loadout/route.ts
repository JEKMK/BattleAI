import { db } from "@/lib/db";
import { runners, runnerImplants, runnerStims } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("x-runner-token");
    if (!token) return Response.json({ error: "Missing token" }, { status: 401 });

    const runner = await db.query.runners.findFirst({ where: eq(runners.token, token) });
    if (!runner) return Response.json({ error: "Runner not found" }, { status: 404 });

    const implants = await db.select().from(runnerImplants).where(eq(runnerImplants.runnerId, runner.id));
    const stims = await db.select().from(runnerStims).where(eq(runnerStims.runnerId, runner.id));

    return Response.json({
      credits: runner.credits,
      implants: implants.map((i) => ({ implantId: i.implantId, slotType: i.slotType })),
      stims: stims.map((s) => ({ stimId: s.stimId })),
    });
  } catch (err) {
    console.error("Loadout error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
