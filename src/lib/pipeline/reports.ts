import type { Classified, ResolvedPlace, Verification } from "@/lib/ai/schema";
import type { ClassifiedRow } from "./batch";
import type { CleanRow } from "./clean";

/** What the Explorer and the Dataset table actually render. */
export type Report = CleanRow & {
  result: Classified;
  place?: ResolvedPlace;
  verification?: Verification;
};

/**
 * Joins on report_id, not on array position. `result.i` is only ever an index
 * within one batch, so using it across the whole file silently mismatches rows.
 */
export function buildReports(
  classified: ClassifiedRow[],
  places: ResolvedPlace[],
  verifications: Map<string, Verification>,
): Report[] {
  const placeByName = new Map(places.map((p) => [p.name, p]));

  return classified.map((row): Report => {
    const primary = row.result.places[0];
    return {
      ...row,
      place: primary ? placeByName.get(primary.name) : undefined,
      verification: verifications.get(row.report_id),
    };
  });
}

/** The precomputed sample stores plain results; attach them to their rows by position. */
export function attachResults(rows: CleanRow[], results: Classified[]): ClassifiedRow[] {
  return results
    .map((result) => {
      const row = rows[result.i];
      return row ? { ...row, result } : undefined;
    })
    .filter((r): r is ClassifiedRow => r !== undefined);
}

/** Every distinct place the model named, so we resolve each one once. */
export function uniquePlaceNames(classified: ClassifiedRow[]): string[] {
  const names = new Set<string>();
  for (const row of classified) {
    if (!row.result.rel) continue;
    for (const place of row.result.places) names.add(place.name);
  }
  return [...names];
}

/** Only tweets that assert something about official status go to the verify task. */
export function claimRows(classified: ClassifiedRow[]): ClassifiedRow[] {
  return classified.filter((row) => row.result.rel && row.result.claim);
}

export type Filters = {
  urgency: string;
  category: string;
  search: string;
  relevantOnly: boolean;
};

export const EMPTY_FILTERS: Filters = {
  urgency: "all",
  category: "all",
  search: "",
  relevantOnly: true,
};

export function applyFilters(reports: Report[], filters: Filters): Report[] {
  const needle = filters.search.trim().toLowerCase();
  return reports.filter((r) => {
    if (filters.relevantOnly && !r.result.rel) return false;
    if (filters.urgency !== "all" && r.result.urg !== filters.urgency) return false;
    if (filters.category !== "all" && r.result.cat !== filters.category) return false;
    if (needle && !r.clean_text.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export const URGENCY_LABEL = {
  critical: "Critical",
  urgent: "Urgent",
  information: "Information",
} as const;

export const CONFIDENCE_LABEL = { h: "High", m: "Medium", l: "Low" } as const;

export function countByUrgency(reports: Report[]) {
  return {
    critical: reports.filter((r) => r.result.urg === "critical").length,
    urgent: reports.filter((r) => r.result.urg === "urgent").length,
    information: reports.filter((r) => r.result.urg === "information").length,
  };
}

/** Splits a tweet around the exact words the model used to place it, for highlighting. */
export function splitOnEvidence(text: string, evidence?: string) {
  if (!evidence) return [{ text, match: false }];
  const at = text.indexOf(evidence);
  if (at === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, at), match: false },
    { text: evidence, match: true },
    { text: text.slice(at + evidence.length), match: false },
  ].filter((part) => part.text.length > 0);
}
