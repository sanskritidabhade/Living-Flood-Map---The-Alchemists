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

  for (let start = 0; start < batches.length; start += PARALLEL) {
    const slice = batches.slice(start, start + PARALLEL);
    const settled = await Promise.allSettled(slice.map((batch) => runBatch(batch, profile)));

    settled.forEach((outcome, offset) => {
      const batchIndex = start + offset;
      const batch = batches[batchIndex];
      if (outcome.status === "fulfilled") {
        for (const result of outcome.value) {
          const row = batch[result.i];
          if (row) rows.push({ ...row, result });
        }
      } else {
        failedBatches.push(batchIndex);
      }
      done += batch.length;
    });

    onProgress({ stage: "Reading tweets", done, total: unique.length, failedBatches: [...failedBatches] });
  }

  return { rows, failedBatches };
}

/** Duplicates and retweets inherit the classification of their group representative. */
export function fanOutToDuplicates(all: CleanRow[], classified: ClassifiedRow[]): ClassifiedRow[] {
  const byText = new Map(classified.map((row) => [row.clean_text, row.result]));
  const out: ClassifiedRow[] = [];
  for (const row of all) {
    const result = byText.get(row.clean_text);
    if (result) out.push({ ...row, result });
  }
  return out;
}
