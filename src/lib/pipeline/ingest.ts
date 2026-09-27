import Papa from "papaparse";

/**
 * CSV in, rows out. The judges upload an unseen file, so nothing may assume a
 * column called `tweet` — we detect the text column and show the user what we
 * picked before anything is sent to the AI.
 */

export const MAX_ROWS = 20_000;

const TEXT_COLUMN_CANDIDATES = ["tweet", "text", "tweet_text", "content", "message", "body", "status"];
const ID_CANDIDATES = ["id", "tweet_id", "row_id", "status_id"];
const TIME_CANDIDATES = ["timestamp", "created_at", "time", "date", "datetime", "posted_at"];
const AUTHOR_CANDIDATES = ["author", "user", "username", "screen_name", "handle"];
const LAT_CANDIDATES = ["lat", "latitude", "y"];
const LON_CANDIDATES = ["lon", "lng", "long", "longitude", "x"];
const LABEL_CANDIDATES = ["label", "class", "on_topic", "relevant", "category"];

export type ColumnMapping = {
  text: string;
  id?: string;
  timestamp?: string;
  author?: string;
  lat?: string;
  lon?: string;
  label?: string;
};

export type RawRow = Record<string, string>;

export type IngestResult = {
  rows: RawRow[];
  columns: string[];
  mapping: ColumnMapping;
  truncated: boolean;
  /** No timestamp column means the map shows concentration, not spread. */
  hasTime: boolean;
};

function pick(columns: string[], candidates: string[]): string | undefined {
  const lower = new Map(columns.map((c) => [c.trim().toLowerCase(), c]));
  for (const candidate of candidates) {
    const hit = lower.get(candidate);
    if (hit) return hit;
  }
  return undefined;
}

/** Fallback when no column is named recognisably: the one with the longest average text. */
function longestTextColumn(rows: RawRow[], columns: string[]): string {
  const sample = rows.slice(0, 200);
  let best = columns[0] ?? "";
  let bestLength = -1;
  for (const col of columns) {
    const total = sample.reduce((sum, row) => sum + (row[col]?.length ?? 0), 0);
    const avg = sample.length ? total / sample.length : 0;
    if (avg > bestLength) {
      bestLength = avg;
      best = col;
    }
  }
  return best;
}

export function detectMapping(rows: RawRow[], columns: string[]): ColumnMapping {
  return {
    text: pick(columns, TEXT_COLUMN_CANDIDATES) ?? longestTextColumn(rows, columns),
    id: pick(columns, ID_CANDIDATES),
    timestamp: pick(columns, TIME_CANDIDATES),
    author: pick(columns, AUTHOR_CANDIDATES),
    lat: pick(columns, LAT_CANDIDATES),
    lon: pick(columns, LON_CANDIDATES),
    label: pick(columns, LABEL_CANDIDATES),
  };
}

export function parseCsv(csv: string): IngestResult {
  const parsed = Papa.parse<RawRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const all = parsed.data.filter((row) => Object.values(row).some((v) => v && v.trim() !== ""));
  const columns = parsed.meta.fields?.map((f) => f.trim()) ?? Object.keys(all[0] ?? {});
  const rows = all.slice(0, MAX_ROWS);
  const mapping = detectMapping(rows, columns);

  return {
    rows,
    columns,
    mapping,
    truncated: all.length > MAX_ROWS,
    hasTime: Boolean(mapping.timestamp),
  };
}
