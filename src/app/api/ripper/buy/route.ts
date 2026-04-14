import { db } from "@/lib/db";
import { runners, runnerImplants, runnerStims } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { IMPLANTS, STIMS, CONTEXT_LEVELS } from "@/lib/implants";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-runner-token");
    if (!token) return Response.json({ error: "Missing token" }, { status: 401 });

    const { itemId, type } = await req.json() as { itemId: string; type: "implant" | "stim" | "os" };

    const runner = await db.query.runners.findFirst({ where: eq(runners.token, token) });
    if (!runner) return Response.json({ error: "Runner not found" }, { status: 404 });

    if (type === "implant") {
      const implant = IMPLANTS[itemId];
      if (!implant) return Response.json({ error: "Unknown implant" }, { status: 400 });
      if (runner.credits < implant.cost) return Response.json({ error: "Not enough credits" }, { status: 400 });

      // Remove existing implant in same slot (if any)
      await db.delete(runnerImplants).where(
        and(eq(runnerImplants.runnerId, runner.id), eq(runnerImplants.slotType, implant.slot))
      );

      // Equip new implant
      await db.insert(runnerImplants).values({
        runnerId: runner.id,
        implantId: implant.id,
        slotType: implant.slot,
      });

      // Deduct credits + apply RAM bonus if neural processor
      const ramUpdate = implant.effects.ramBonus ? { ram: runner.ram + implant.effects.ramBonus } : {};
      await db.update(runners).set({
        credits: runner.credits - implant.cost,
        ...ramUpdate,
        updatedAt: new Date(),
      }).where(eq(runners.id, runner.id));

      return Response.json({
        ok: true,
        credits: runner.credits - implant.cost,
        message: `${implant.name} installed. ${implant.description}.`,
      });

    } else if (type === "stim") {
      const stim = STIMS[itemId];
      if (!stim) return Response.json({ error: "Unknown stim" }, { status: 400 });
      if (runner.credits < stim.cost) return Response.json({ error: "Not enough credits" }, { status: 400 });

      // Remove existing stim of same type (only 1 of each active)
      await db.delete(runnerStims).where(
        and(eq(runnerStims.runnerId, runner.id), eq(runnerStims.stimId, stim.id))
      );

      // Add stim
      await db.insert(runnerStims).values({
        runnerId: runner.id,
        stimId: stim.id,
      });

      // Deduct credits
      await db.update(runners).set({
        credits: runner.credits - stim.cost,
        updatedAt: new Date(),
      }).where(eq(runners.id, runner.id));

      return Response.json({
        ok: true,
        credits: runner.credits - stim.cost,
        message: `${stim.name} loaded. ${stim.description}.`,
      });
    } else if (type === "os") {
      const level = CONTEXT_LEVELS.find((l) => l.id === itemId);
      if (!level) return Response.json({ error: "Unknown OS level" }, { status: 400 });
      if (level.level <= runner.contextLevel) return Response.json({ error: "Already at this level or higher" }, { status: 400 });
      if (runner.credits < level.cost) return Response.json({ error: "Not enough credits" }, { status: 400 });

      await db.update(runners).set({
        contextLevel: level.level,
        credits: runner.credits - level.cost,
        updatedAt: new Date(),
      }).where(eq(runners.id, runner.id));

      return Response.json({
        ok: true,
        credits: runner.credits - level.cost,
        contextLevel: level.level,
        message: `${level.name} installed. ${level.description}.`,
      });
    }

    return Response.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Buy error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
