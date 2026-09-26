import type { Classified, ResolvedPlace, Verification } from "@/lib/ai/schema";
import type { CleanRow } from "./clean";

/** What the Explorer and the Dataset table actually render. */
export type Report = CleanRow & {
  result: Classified;
  place?: ResolvedPlace;
  verification?: Verification;
};

export function buildReports(
  rows: CleanRow[],
  results: Classified[],
  places: ResolvedPlace[],
  verifications: Verification[],
): Report[] {
  const placeByName = new Map(places.map((p) => [p.name, p]));
  const verificationByIndex = new Map(verifications.map((v) => [v.i, v]));

  return results
    .map((result): Report | undefined => {
      const row = rows[result.i];
      if (!row) return undefined;
      const primary = result.places[0];
      return {
        ...row,
        result,
        place: primary ? placeByName.get(primary.name) : undefined,
        verification: verificationByIndex.get(result.i),
      };
    })
    .filter((r): r is Report => r !== undefined);
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
