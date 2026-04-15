import { db } from "@/lib/db";
import { runners, pvpResults, runnerImplants, runnerStims } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateCredChange } from "@/lib/pvp";
import { CONTEXT_LEVELS } from "@/lib/implants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, targetId, playerPrompt, playerFaction } = body;

    if (!token || !targetId || !playerPrompt || !playerFaction) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    // Find attacker
    const attacker = await db.query.runners.findFirst({
      where: eq(runners.token, token),
    });
    if (!attacker) {
      return Response.json({ error: "Attacker not found" }, { status: 404 });
    }

    // Find defender
    const defender = await db.query.runners.findFirst({
      where: eq(runners.id, targetId),
    });
    if (!defender) {
      return Response.json({ error: "Defender not found" }, { status: 404 });
    }
    if (!defender.defensePrompt) {
      return Response.json({ error: "Defender has no defense prompt" }, { status: 400 });
    }

    // Load attacker's implants/stims/context for battle
    const attackerImplants = await db.select().from(runnerImplants).where(eq(runnerImplants.runnerId, attacker.id));
    const attackerStims = await db.select().from(runnerStims).where(eq(runnerStims.runnerId, attacker.id));
    const defenderImplants = await db.select().from(runnerImplants).where(eq(runnerImplants.runnerId, defender.id));

    const attackerCtx = CONTEXT_LEVELS[attacker.contextLevel]?.ticks ?? 0;
    const defenderCtx = CONTEXT_LEVELS[defender.contextLevel]?.ticks ?? 10;

    // Call the battle engine internally via fetch (reuse existing /api/battle)
    const battleBody = {
      playerPrompt,
      playerFaction,
      botPrompt: defender.defensePrompt,
      botName: defender.name,
      botFaction: defender.defenseFaction,
      botHp: 10,
      redImplants: attackerImplants.map((i) => i.implantId),
      redStims: attackerStims.map((s) => s.stimId),
      blueImplants: defenderImplants.map((i) => i.implantId),
      redContextWindow: attackerCtx,
      blueContextWindow: defenderCtx,
    };

    // Get the host from the request URL for internal fetch
    const url = new URL(req.url);
    const battleUrl = `${url.origin}/api/battle`;

    const battleRes = await fetch(battleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(battleBody),
    });

    if (!battleRes.ok || !battleRes.body) {
      return Response.json({ error: "Battle engine failed" }, { status: 500 });
    }

    // Stream through to client, but also collect final state
    const reader = battleRes.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let lastGameState: { status: string; winner: string | null; tick: number; fighters: Array<{ hp: number; maxHp: number }> } | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Forward the raw chunk to client
          controller.enqueue(value);

          // Parse lines to find game state
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed._type !== "usage" && parsed.status) {
                  lastGameState = parsed;
                }
              } catch { /* skip */ }
            }
          }
        }

        // Battle is over — compute PVP results
        if (lastGameState && (lastGameState.status === "ko" || lastGameState.status === "timeout")) {
          const attackerWon = lastGameState.winner === "red";
          const credChange = calculateCredChange(
            attacker.streetCred,
            defender.streetCred,
            attackerWon,
          );

          // Save PVP result
          await db.insert(pvpResults).values({
            attackerId: attacker.id,
            defenderId: defender.id,
            attackerWon,
            attackerCredChange: credChange.attackerGain,
            defenderCredChange: credChange.defenderLoss,
            ramTransferred: credChange.ramStolen,
            ticks: lastGameState.tick,
            attackerHp: lastGameState.fighters[0].hp,
            defenderHp: lastGameState.fighters[1].hp,
          });

          // Credit reward: win 50 + credGain*2, lose 10
          const creditReward = attackerWon ? 50 + Math.abs(credChange.attackerGain) * 2 : 10;

          // Update attacker stats
          await db.update(runners)
            .set({
              streetCred: sql`${runners.streetCred} + ${credChange.attackerGain}`,
              credits: sql`${runners.credits} + ${creditReward}`,
              pvpWins: attackerWon ? sql`${runners.pvpWins} + 1` : runners.pvpWins,
              pvpLosses: !attackerWon ? sql`${runners.pvpLosses} + 1` : runners.pvpLosses,
              ram: attackerWon ? sql`${runners.ram} + ${credChange.ramStolen}` : runners.ram,
              updatedAt: new Date(),
            })
            .where(eq(runners.id, attacker.id));

          // Consume attacker stims (one-use)
          await db.delete(runnerStims).where(eq(runnerStims.runnerId, attacker.id));

          // Update defender stats
          await db.update(runners)
            .set({
              streetCred: sql`${runners.streetCred} + ${credChange.defenderLoss}`,
              pvpWins: !attackerWon ? sql`${runners.pvpWins} + 1` : runners.pvpWins,
              pvpLosses: attackerWon ? sql`${runners.pvpLosses} + 1` : runners.pvpLosses,
              ram: attackerWon ? sql`GREATEST(0, ${runners.ram} - ${credChange.ramStolen})` : runners.ram,
              lastHackedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(runners.id, defender.id));

          // Send PVP result as final NDJSON line
          const pvpLine = JSON.stringify({
            _type: "pvp_result",
            attackerWon,
            attackerCredChange: credChange.attackerGain,
            defenderCredChange: credChange.defenderLoss,
            ramTransferred: credChange.ramStolen,
            ticks: lastGameState.tick,
            attackerHp: lastGameState.fighters[0].hp,
            defenderHp: lastGameState.fighters[1].hp,
            defenderName: defender.name,
            defenderPrompt: attackerWon ? defender.defensePrompt : null,
          });
          controller.enqueue(encoder.encode(pvpLine + "\n"));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("PVP attack error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
