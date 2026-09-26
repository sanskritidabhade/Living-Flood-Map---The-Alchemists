import type { Classified, Profile } from "@/lib/ai/schema";
import type { CleanRow } from "./clean";

/**
 * The browser drives the batching: each server call covers one batch, so no
 * Vercel timeout, and pins land on the map as batches finish rather than all at
 * the end. ~75 calls for the provided dataset.
 */

export const BATCH_SIZE = 100;
export const PARALLEL = 4;

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
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "classify",
      profile,
      input: batch.map((row, i) => ({ i, text: row.clean_text })),
    }),
  });
  if (!res.ok) throw new Error(`Batch failed: ${res.status}`);
  const body = await res.json();
  return body.data.results as Classified[];
}

/** One retry, then the batch is marked failed and the run continues. Resumable. */
async function runBatch(batch: CleanRow[], profile: Profile): Promise<Classified[]> {
  try {
    return await postBatch(batch, profile);
  } catch {
    return await postBatch(batch, profile);
  }
}

export type ClassifiedRow = CleanRow & { result: Classified };

export async function classifyAll(
  unique: CleanRow[],
  profile: Profile,
  onProgress: (p: BatchProgress) => void,
): Promise<{ rows: ClassifiedRow[]; failedBatches: number[] }> {
  const batches = makeBatches(unique);
  const rows: ClassifiedRow[] = [];
  const failedBatches: number[] = [];
  let done = 0;
  let found = 0;

  for (let start = 0; start < batches.length; start += PARALLEL) {
    const slice = batches.slice(start, start + PARALLEL);
    const settled = await Promise.allSettled(slice.map((batch) => runBatch(batch, profile)));

    settled.forEach((outcome, offset) => {
      const batchIndex = start + offset;
      const batch = batches[batchIndex];
      if (outcome.status === "fulfilled") {
        for (const result of outcome.value) {
          // result.i is the index within this batch, not the whole file.
          const row = batch[result.i];
          if (row) {
            rows.push({ ...row, result });
            if (result.rel) found += 1;
          }
        }
      } else {
        failedBatches.push(batchIndex);
      }
      done += batch.length;
    });

    // Fires after every group of batches, so the counter moves on the upload path too.
    onProgress({
      stage: "Reading tweets",
      done,
      total: unique.length,
      found,
      rows: [...rows],
      failedBatches: [...failedBatches],
    });
  }

  return { rows, failedBatches };
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
