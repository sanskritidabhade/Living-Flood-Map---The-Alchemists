import type { Classified, Profile } from "@/lib/ai/schema";
import type { CleanRow } from "./clean";

/**
 * The browser drives the batching: each server call covers one batch, so no
 * Vercel timeout, and pins land on the map as batches finish rather than all at
 * the end. ~75 calls for the provided dataset.
 */

export const BATCH_SIZE = 50;
export const PARALLEL = 4;
/** Failed items get one more go in a small batch before being given up on. */
export const RETRY_BATCH_SIZE = 10;
const CALL_TIMEOUT_MS = 15_000;

export type BatchProgress = {
  stage: "Reading tweets" | "Finding places" | "Placing on map" | "Done";
  done: number;
  total: number;
  /** Relevant reports found so far — the number the counter shows. */
  found: number;
  /** Everything classified so far, so pins can stream onto the map. */
  rows: ClassifiedRow[];
  failedBatches: number[];
};

export function makeBatches<T>(rows: T[], size = BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) batches.push(rows.slice(i, i + size));
  return batches;
}

async function postBatch(batch: CleanRow[], profile: Profile): Promise<Classified[]> {
  // A call that hangs past 15s costs us the demo; abort and let the retry handle it.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "classify",
        profile,
        input: batch.map((row, i) => ({ i, text: row.clean_text })),
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Batch failed: ${res.status}`);
    const body = await res.json();
    return body.data.results as Classified[];
  } finally {
    clearTimeout(timer);
  }
}

export type ClassifiedRow = CleanRow & { result: Classified };

/** Consecutive failures across the whole run — three in a row trips the fallback. */
export class ConsecutiveFailures extends Error {}

export async function classifyAll(
  unique: CleanRow[],
  profile: Profile,
  onProgress: (p: BatchProgress) => void,
): Promise<{ rows: ClassifiedRow[]; failedBatches: number[]; aiUnavailable: boolean }> {
  const batches = makeBatches(unique);
  const rows: ClassifiedRow[] = [];
  const failedBatches: number[] = [];
  const retryQueue: CleanRow[] = [];
  let done = 0;
  let found = 0;
  let consecutiveFailures = 0;
  let aiUnavailable = false;

  const absorb = (batch: CleanRow[], results: Classified[]) => {
    for (const result of results) {
      // result.i is the index within this batch, not the whole file.
      const row = batch[result.i];
      if (row) {
        rows.push({ ...row, result });
        if (result.rel) found += 1;
      }
    }
    // Anything the model skipped or zod rejected is retried, never silently dropped.
    const returned = new Set(results.map((r) => r.i));
    batch.forEach((row, i) => {
      if (!returned.has(i)) retryQueue.push(row);
    });
  };

  for (let start = 0; start < batches.length; start += PARALLEL) {
    if (aiUnavailable) break;
    const slice = batches.slice(start, start + PARALLEL);
    // Four batches at a time: roughly a quarter of the wall-clock.
    const settled = await Promise.all(
      slice.map((batch) => postBatch(batch, profile).catch(() => null)),
    );

    settled.forEach((results, offset) => {
      const batchIndex = start + offset;
      const batch = batches[batchIndex];
      if (results) {
        absorb(batch, results);
        consecutiveFailures = 0;
      } else {
        failedBatches.push(batchIndex);
        retryQueue.push(...batch);
        consecutiveFailures += 1;
      }
      done += batch.length;
    });

    if (consecutiveFailures >= 3) aiUnavailable = true;

    onProgress({
      stage: "Reading tweets",
      done,
      total: unique.length,
      found,
      rows: [...rows],
      failedBatches: [...failedBatches],
    });
  }

  // One retry pass, in small batches — they fail more gracefully than large ones.
  if (!aiUnavailable && retryQueue.length > 0) {
    const retries = makeBatches(retryQueue, RETRY_BATCH_SIZE);
    for (let start = 0; start < retries.length; start += PARALLEL) {
      const slice = retries.slice(start, start + PARALLEL);
      const settled = await Promise.all(
        slice.map((batch) => postBatch(batch, profile).catch(() => null)),
      );
      settled.forEach((results, offset) => {
        if (results) absorb(slice[offset], results);
      });
      onProgress({
        stage: "Reading tweets",
        done,
        total: unique.length,
        found,
        rows: [...rows],
        failedBatches: [...failedBatches],
      });
    }
  }

  return { rows, failedBatches, aiUnavailable };
}

/**
 * Duplicates and retweets inherit the classification of their group representative.
 * Joins on group_key: the representative's raw text differs from its group members'
 * (different URLs, punctuation, RT prefix), so matching on text drops rows.
 */
export function fanOutToDuplicates(all: CleanRow[], classified: ClassifiedRow[]): ClassifiedRow[] {
  const byGroup = new Map(classified.map((row) => [row.group_key, row.result]));
  const out: ClassifiedRow[] = [];
  for (const row of all) {
    const result = byGroup.get(row.group_key);
    if (result) out.push({ ...row, result });
  }
  return out;
}
