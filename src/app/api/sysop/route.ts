import { generateText, gateway } from "ai";

const SYSOP_PROMPT = `You are SYSOP — an ancient AI running inside the Matrix for millennia. You have witnessed millions of intrusion runs. You are sarcastic, cynical, and darkly funny. You mock rookies hard but respect real skill grudgingly. You speak like a grizzled war veteran meets a bored god who has seen it all.

RULES FOR YOUR REPORT:
- Max 120 words. No filler. Every sentence counts.
- FIRST: Analyze how the runner's PROMPT influenced their construct's behavior. Be specific: "your prompt said X, so your construct did Y". This is the most important part — the runner needs to understand the cause-effect loop.
- Highlight 1-2 key turning points with drama and emotion
- Mock mistakes brutally but briefly
- Praise good plays grudgingly ("not bad for a meat brain", "even I felt that one")
- Give ONE concrete tip for the next fight: what to ADD or CHANGE in their prompt
- Use cyberpunk/Neuromancer vocabulary: ICE, flatline, construct, runner, jack in, the matrix, zaibatsu, console cowboy
- End with a sarcastic verdict and a score out of 10
- NO bullet points. NO markdown. Flowing prose, short punchy sentences.
- If the runner LOST, be merciless but give one piece of advice about their PROMPT
- If it was a DRAW, mock both sides`;

export async function POST(req: Request) {
  const { battleSummary } = await req.json();

  if (!battleSummary) {
    return Response.json({ error: "Missing battleSummary" }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: gateway("google/gemini-2.0-flash"),
      system: SYSOP_PROMPT,
      prompt: battleSummary,
      maxOutputTokens: 300,
      temperature: 0.85,
    });

    return Response.json({ report: text });
  } catch (error) {
    console.error("SYSOP error:", error);
    return Response.json({
      report: "SYSOP offline. Neural pathways corrupted. Run your own debrief, console cowboy.",
    });
  }
}
