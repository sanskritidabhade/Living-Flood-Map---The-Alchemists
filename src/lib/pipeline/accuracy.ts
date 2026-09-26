import type { Report } from "./reports";

/**
 * If the uploaded CSV carried its own labels (CrisisLexT6 ships on-topic /
 * off-topic), score our classifier against them. The label is never shown to
 * the model — it is stripped at ingest and only used here.
 */

const POSITIVE = ["on-topic", "on topic", "ontopic", "related", "relevant", "yes", "true", "1"];
const NEGATIVE = ["off-topic", "off topic", "offtopic", "unrelated", "irrelevant", "no", "false", "0"];

export function labelToBool(raw: string | undefined): boolean | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (POSITIVE.includes(v)) return true;
  if (NEGATIVE.includes(v)) return false;
  return undefined;
}

export type Accuracy = {
  matched: number;
  precision: number;
  recall: number;
  f1: number;
};

export function scoreAgainstLabels(reports: Report[]): Accuracy | null {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let matched = 0;

  for (const r of reports) {
    const truth = labelToBool(r.label);
    if (truth === undefined) continue;
    matched += 1;
    const predicted = r.result.rel;
    if (predicted && truth) tp += 1;
    else if (predicted && !truth) fp += 1;
    else if (!predicted && truth) fn += 1;
  }

  if (matched === 0) return null;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { matched, precision, recall, f1 };
}

export const asPercent = (n: number) => `${Math.round(n * 100)}%`;
