import Papa from "papaparse";
import type { ResolvedPlace, Verification } from "@/lib/ai/schema";
import { anonymizeHandles } from "./clean";
import type { ClassifiedRow } from "./batch";

/**
 * Deliverable B. GeoJSON is the bridge to MapAki — it has no public API, so the
 * file is the integration. The one approval gate in the app is Publish export:
 * one analyst, one click, stamped with who and when.
 */

export type ReportRow = Record<string, string | number | boolean | null>;

export type PublishStamp = {
  reviewed_by: string;
  reviewed_at: string;
  corrections: number;
  model: string;
  source_file: string;
  source_rows: number;
};

export const EXPORT_COLUMNS = [
  "report_id", "source_row", "text", "clean_text", "is_retweet", "echo_count", "hashtags", "link_count",
  "relevant", "relevance_confidence", "relevance_reason",
  "category", "urgency", "firsthand", "needs",
  "claim_type", "expected_source", "expected_source_url", "verification_status", "verification_confidence",
  "place_text", "place_name", "place_type", "place_role", "lat", "lng", "location_precision", "first_nation_community",
  "time_text", "time_type", "posted_at",
  "who_affected", "source_type",
  "review_status", "reviewed_by", "reviewed_at", "changed_fields", "model", "processed_at",
] as const;

const CONFIDENCE_WORD = { h: "high", m: "medium", l: "low" } as const;

export function toReportRows(
  rows: ClassifiedRow[],
  places: Map<string, ResolvedPlace>,
  verifications: Map<string, Verification>,
  opts: { model: string; anonymize?: boolean; stamp?: PublishStamp },
): ReportRow[] {
  const processed_at = new Date().toISOString();

  return rows.map((row) => {
    const r = row.result;
    const primary = r.places[0];
    const resolved = primary ? places.get(primary.name) : undefined;
    const verification = verifications.get(row.report_id);
    const text = opts.anonymize === false ? row.text : anonymizeHandles(row.text);

    return {
      report_id: row.report_id,
      source_row: row.source_row,
      text,
      clean_text: opts.anonymize === false ? row.clean_text : anonymizeHandles(row.clean_text),
      is_retweet: row.is_retweet,
      echo_count: row.echo_count,
      hashtags: row.hashtags.map((h) => `#${h}`).join(" "),
      link_count: row.link_count,

      relevant: r.rel,
      relevance_confidence: CONFIDENCE_WORD[r.conf],
      relevance_reason: r.why ?? "",

      category: r.cat,
      urgency: r.urg,
      firsthand: r.eye,
      needs: r.needs.join(", "),

      claim_type: verification?.claim_type ?? "",
      expected_source: verification?.expected_source ?? "",
      expected_source_url: verification?.expected_source_url ?? "",
      verification_status: verification?.verification_status ?? "",
      verification_confidence: verification ? CONFIDENCE_WORD[verification.confidence] : "",

      place_text: primary?.text ?? "",
      place_name: primary?.name ?? "",
      place_type: primary?.type ?? "",
      place_role: primary?.role ?? "",
      lat: resolved?.lat ?? null,
      lng: resolved?.lng ?? null,
      location_precision: resolved?.precision ?? "",
      first_nation_community: r.fn ?? "",

      time_text: r.time?.text ?? "",
      time_type: r.time?.type ?? "",
      posted_at: row.posted_at ?? "",

      who_affected: r.who ?? "",
      source_type: r.src,

      review_status: opts.stamp ? "published" : "AI draft",
      reviewed_by: opts.stamp?.reviewed_by ?? "",
      reviewed_at: opts.stamp?.reviewed_at ?? "",
      changed_fields: "",
      model: opts.model,
      processed_at,
    };
  });
}

export function toCsv(rows: ReportRow[]): string {
  return Papa.unparse(rows, { columns: [...EXPORT_COLUMNS] });
}

/**
 * The audit trail: what the model threw away and why. Kept separate from the
 * main export so the MapAki layer only ever receives related reports.
 */
export const EXCLUDED_COLUMNS = [
  "source_row",
  "text",
  "relevance_reason",
  "model",
  "processed_at",
] as const;

export function toExcludedRows(rows: ClassifiedRow[], model: string): ReportRow[] {
  const processed_at = new Date().toISOString();
  return rows
    .filter((row) => !row.result.rel)
    .map((row) => ({
      source_row: row.source_row,
      text: anonymizeHandles(row.text),
      relevance_reason: row.result.why ?? "Not related to this event",
      model,
      processed_at,
    }));
}

export function toExcludedCsv(rows: ReportRow[]): string {
  return Papa.unparse(rows, { columns: [...EXCLUDED_COLUMNS] });
}

export function download(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
