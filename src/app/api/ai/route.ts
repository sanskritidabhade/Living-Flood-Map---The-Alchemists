import { NextResponse } from "next/server";
import { z } from "zod";
import { callAi, isMockMode } from "@/lib/ai/client";
import { promptFor } from "@/lib/ai/prompts";
import { RESPONSE_SCHEMAS, validate, zProfile, type AiTask } from "@/lib/ai/schema";

/** The only place the AI is called. The key stays here. */

export const runtime = "nodejs";

const TASKS = ["profile", "classify", "places", "brief", "verify", "ask"] as const;

const zBody = z.object({
  task: z.enum(TASKS),
  input: z.unknown(),
  profile: zProfile.optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof zBody>;
  try {
    body = zBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Send { task, input, profile? } with a known task." }, { status: 400 });
  }

  const task = body.task as AiTask;

  // Fast "Ask" Handler: Send a 1-page summary JSON to Gemini, not thousands of raw rows
  if (task === "ask" && typeof body.input === "object" && body.input !== null) {
    const inp = body.input as Record<string, any>;
    const tweets = inp.reports || inp.tweets || [];
    if (Array.isArray(tweets) && tweets.length > 0) {
      const summary = {
        total_tweets: tweets.length,
        critical_count: tweets.filter((t: any) => t.urg === "critical" || t.urgency === "critical").length,
        top_locations: Array.from(
          new Set(
            tweets
              .flatMap((t: any) => [
                t.place,
                ...(t.places ? t.places.map((p: any) => (typeof p === "string" ? p : p.name)) : []),
              ])
              .filter(Boolean),
          ),
        ).slice(0, 10),
        infrastructure_hazards: tweets
          .filter(
            (t: any) =>
              t.cat === "Road or bridge closed" ||
              t.category === "Road or bridge closed" ||
              (t.text && /bridge|road|highway|closure/i.test(t.text)),
          )
          .map((t: any) => t.text || t.clean_text)
          .slice(0, 5),
        key_reports: tweets.slice(0, 35).map((t: any) => ({
          id: t.id || t.report_id,
          text: (t.text || t.clean_text || "").slice(0, 140),
          urg: t.urg || t.urgency,
          place: t.place || t.places?.[0]?.name,
          fn: t.fn,
          needs: t.needs,
        })),
      };
      body.input = {
        userQuery: inp.question || inp.userQuery || "",
        summary,
      };
    }
  }

  try {
    const prompt = promptFor(task, body.profile);
    const result = await callAi(task, body.input, {
      prompt,
      responseSchema: RESPONSE_SCHEMAS[task],
    });
    // Invalid items go to review rather than onto the map as guesses.
    const data = validate(task, result.data);
    return NextResponse.json({
      data,
      source: result.source,
      requests_remaining: result.requests_remaining,
      mode: isMockMode() ? "MOCK" : "LIVE",
    });
  } catch (err) {
    console.error(`[api/ai] task=${task}`, err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : "The AI request could not be completed.";
    // The caller falls back to the keyword scorer, so the app never dead-ends.
    return NextResponse.json({ error: message, fallback: true }, { status: 502 });
  }
}
