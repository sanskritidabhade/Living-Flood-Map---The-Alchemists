import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { AiTask } from "./schema";

/**
 * Server-only. The key never reaches the browser.
 *
 * Mock mode returns the matching file from mocks/ after ~800ms so loading
 * states are visible. Live mode goes through a cache first — hackathon credits
 * are limited, so the same input is never paid for twice.
 */

const MOCK_DELAY_MS = 800;
const CACHE_DIR = path.join(process.cwd(), ".cache");

export function isMockMode(): boolean {
  return (process.env.USE_MOCK ?? "true") !== "false";
}

export function model(): string {
  return process.env.AI_MODEL ?? "gemini-3-flash-preview";
}

export function cacheKey(task: AiTask, input: unknown): string {
  return createHash("sha256").update(`${task}:${model()}:${JSON.stringify(input)}`).digest("hex").slice(0, 32);
}

/** Vercel's filesystem is read-only outside /tmp, so the file cache is dev-only. */
const memoryCache = new Map<string, unknown>();
const canUseFileCache = process.env.NODE_ENV !== "production";

async function cacheGet(key: string): Promise<unknown | undefined> {
  if (memoryCache.has(key)) return memoryCache.get(key);
  if (!canUseFileCache) return undefined;
  try {
    const raw = await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    const value = JSON.parse(raw);
    memoryCache.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

async function cacheSet(key: string, value: unknown): Promise<void> {
  memoryCache.set(key, value);
  if (!canUseFileCache) return;
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value), "utf8");
  } catch {
    // A cache miss is survivable; a crashed request is not.
  }
}

async function readMock(task: AiTask): Promise<unknown> {
  const file = task === "routes" ? "evacuation" : task;
  const raw = await readFile(path.join(process.cwd(), "mocks", `${file}.json`), "utf8");
  return JSON.parse(raw);
}

export type AiResult = {
  data: unknown;
  source: "mock" | "cache" | "live";
  requests_remaining: number | null;
};

/**
 * One call per user action. Never call this in a loop or on page load.
 * TODO(live): confirm the request shape against the organizers' API docs at 8:30
 * before the first live call, and pass their response_schema option as given.
 */
export async function callAi(
  task: AiTask,
  input: unknown,
  opts: { prompt: string; responseSchema?: unknown },
): Promise<AiResult> {
  if (isMockMode()) {
    await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
    return { data: await readMock(task), source: "mock", requests_remaining: null };
  }

  const key = cacheKey(task, input);
  const hit = await cacheGet(key);
  if (hit !== undefined) {
    return { data: hit, source: "cache", requests_remaining: null };
  }

  const url = process.env.HACKATHON_API_URL;
  const apiKey = process.env.HACKATHON_API_KEY;
  if (!url || !apiKey) throw new Error("HACKATHON_API_URL and HACKATHON_API_KEY are required in live mode");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model(),
      prompt: opts.prompt,
      input,
      ...(opts.responseSchema ? { response_schema: opts.responseSchema } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed: ${res.status} ${await res.text().catch(() => "")}`.trim());
  }

  const body = (await res.json()) as { data?: unknown; requests_remaining?: number };
  const data = body.data ?? body;
  await cacheSet(key, data);
  return { data, source: "live", requests_remaining: body.requests_remaining ?? null };
}
