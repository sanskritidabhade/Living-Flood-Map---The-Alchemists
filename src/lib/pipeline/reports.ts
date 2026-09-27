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
  /** Empty means all urgencies; otherwise a multi-select. */
  urgency: string[];
  category: string;
  community: string;
  search: string;
  eyewitnessOnly: boolean;
  needsVerification: boolean;
  /**
   * Off by default. Fallback results are all low confidence, so defaulting this
   * on could hide every report at exactly the moment things had gone wrong.
   */
  hideLowConfidence: boolean;
  /**
   * Map only. On by default so places that are merely *mentioned* (Edmonton
   * sending help, commentary) do not read as flooded.
   */
  affectedOnly: boolean;
};

export const EMPTY_FILTERS: Filters = {
  urgency: [],
  category: "all",
  community: "all",
  search: "",
  eyewitnessOnly: false,
  needsVerification: false,
  hideLowConfidence: false,
  affectedOnly: true,
};

/** How many filters the user has actually changed, for the badge. */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.urgency.length) n += 1;
  if (f.category !== "all") n += 1;
  if (f.community !== "all") n += 1;
  if (f.search.trim()) n += 1;
  if (f.eyewitnessOnly) n += 1;
  if (f.needsVerification) n += 1;
  if (f.hideLowConfidence) n += 1;
  if (!f.affectedOnly) n += 1;
  return n;
}

export function applyFilters(reports: Report[], filters: Filters): Report[] {
  const needle = filters.search.trim().toLowerCase();
  return reports.filter((r) => {
    if (!r.result.rel) return false;
    if (filters.urgency.length && !filters.urgency.includes(r.result.urg)) return false;
    if (filters.category !== "all" && r.result.cat !== filters.category) return false;
    if (filters.community !== "all" && r.result.fn !== filters.community) return false;
    if (filters.eyewitnessOnly && !r.result.eye) return false;
    if (filters.hideLowConfidence && r.result.conf === "l") return false;
    if (filters.needsVerification) {
      const status = r.verification?.verification_status;
      if (status !== "unverified" && status !== "contradicts") return false;
    }
    if (needle) {
      const place = r.result.places.map((p) => p.name).join(" ").toLowerCase();
      if (!r.clean_text.toLowerCase().includes(needle) && !place.includes(needle)) return false;
    }
    return true;
  });
}

/** Related reports whose place could not be given coordinates — never silently dropped. */
export function unmappedReports(reports: Report[]): Report[] {
  return reports.filter((r) => r.result.rel && !r.place);
}

/** Dropdown options built from what the model actually found. */
export function communitiesIn(reports: Report[]): string[] {
  const set = new Set<string>();
  for (const r of reports) if (r.result.rel && r.result.fn) set.add(r.result.fn);
  return [...set].sort();
}

export function countByUrgency(reports: Report[]) {
  return {
    critical: reports.filter((r) => r.result.urg === "critical").length,
    urgent: reports.filter((r) => r.result.urg === "urgent").length,
    information: reports.filter((r) => r.result.urg === "information").length,
  };
}

/**
 * Splits a tweet around the words the model used to place it, for highlighting.
 * Prefers an exact match, then falls back to case-insensitive and hashtag forms
 * ("high river" -> "#highriver") so a near-miss still shows its evidence.
 */
function findEvidence(text: string, evidence: string): [number, number] | null {
  const exact = text.indexOf(evidence);
  if (exact !== -1) return [exact, evidence.length];

  const lower = text.toLowerCase();
  const insensitive = lower.indexOf(evidence.toLowerCase());
  if (insensitive !== -1) return [insensitive, evidence.length];

  const collapsed = evidence.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (collapsed.length >= 4) {
    const tag = lower.indexOf(`#${collapsed}`);
    if (tag !== -1) return [tag, collapsed.length + 1];
  }
  return null;
}

export function splitOnEvidence(text: string, evidence?: string) {
  if (!evidence) return [{ text, match: false }];
  const found = findEvidence(text, evidence);
  if (!found) return [{ text, match: false }];
  const [at, length] = found;
  evidence = text.slice(at, at + length);
  return [
    { text: text.slice(0, at), match: false },
    { text: evidence, match: true },
    { text: text.slice(at + evidence.length), match: false },
  ].filter((part) => part.text.length > 0);
}
