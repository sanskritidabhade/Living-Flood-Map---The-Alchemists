import { NextResponse } from "next/server";
import { z } from "zod";
import { callAi, isMockMode } from "@/lib/ai/client";
import { promptFor } from "@/lib/ai/prompts";
import { RESPONSE_SCHEMAS, validate, zProfile, type AiTask } from "@/lib/ai/schema";

/** The only place the AI is called. The key stays here. */

export const runtime = "nodejs";

const TASKS = ["profile", "classify", "places", "brief", "verify", "evacuation"] as const;

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
