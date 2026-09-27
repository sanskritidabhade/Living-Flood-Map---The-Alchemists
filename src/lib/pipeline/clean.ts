import type { ColumnMapping, RawRow } from "./ingest";

/**
 * Deterministic work before any AI call. On the provided dataset this turns
 * 8,024 rows into ~7,470 unique tweets to classify: 462 exact duplicates are
 * classified once, and 2,225 retweets carry their parent's classification.
 */

export type CleanRow = {
  report_id: string;
  source_row: number;
  text: string;
  clean_text: string;
  is_retweet: boolean;
  retweet_of?: string;
  hashtags: string[];
  mentions: string[];
  link_count: number;
  /** How many rows share this group — amplification, worth showing. */
  echo_count: number;
  /** Normalised key used to group duplicates and retweets. Join on this, not on text. */
  group_key: string;
  posted_at?: string;
  author?: string;
  label?: string;
};

export type CleanResult = {
  rows: CleanRow[];
  /** One representative per duplicate group: the actual AI workload. */
  unique: CleanRow[];
  duplicates: number;
  retweets: number;
};

const RT_PREFIX = /^RT\s+@(\w+)\s*:\s*/i;
const URL_RE = /https?:\/\/\S+/g;
const HASHTAG_RE = /#(\w+)/g;
const MENTION_RE = /@(\w+)/g;

export function decodeEntities(text: string): string {
  return text
    .replace(/\\n/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Personal handles become @user in exports by default. */
export function anonymizeHandles(text: string): string {
  return text.replace(MENTION_RE, "@user");
}

export function cleanText(raw: string): string {
  return decodeEntities(raw).replace(/\s+/g, " ").trim();
}

export function normalizeForGrouping(text: string): string {
  return text
    .replace(RT_PREFIX, "")
    .replace(URL_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9#@\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanRows(rows: RawRow[], mapping: ColumnMapping): CleanResult {
  const groups = new Map<string, CleanRow[]>();
  const cleaned: CleanRow[] = [];
  let retweets = 0;

  rows.forEach((row, index) => {
    const original = row[mapping.text] ?? "";
    const decoded = cleanText(original);
    const rtMatch = decoded.match(RT_PREFIX);
    const isRetweet = Boolean(rtMatch);
    if (isRetweet) retweets += 1;

    const body = decoded.replace(RT_PREFIX, "");
    const clean: CleanRow = {
      group_key: normalizeForGrouping(body),
      report_id: `R-${String(index + 1).padStart(5, "0")}`,
      source_row: index + 1,
      text: original,
      clean_text: body,
      is_retweet: isRetweet,
      retweet_of: rtMatch?.[1],
      hashtags: [...body.matchAll(HASHTAG_RE)].map((m) => m[1].toLowerCase()),
      mentions: [...body.matchAll(MENTION_RE)].map((m) => m[1]),
      link_count: (body.match(URL_RE) ?? []).length,
      echo_count: 1,
      posted_at: mapping.timestamp ? row[mapping.timestamp] : undefined,
      author: mapping.author ? row[mapping.author] : undefined,
      label: mapping.label ? row[mapping.label] : undefined,
    };

    cleaned.push(clean);
    const key = normalizeForGrouping(body);
    const group = groups.get(key);
    if (group) group.push(clean);
    else groups.set(key, [clean]);
  });

  const unique: CleanRow[] = [];
  let duplicates = 0;
  for (const group of groups.values()) {
    const [first, ...rest] = group;
    first.echo_count = group.length;
    for (const row of rest) row.echo_count = group.length;
    duplicates += rest.length;
    unique.push(first);
  }

  return { rows: cleaned, unique, duplicates, retweets };
}

/** Evenly spaced sample so the profile step sees the whole file, not just the top. */
export function sampleForProfile(rows: CleanRow[], size = 150): CleanRow[] {
  if (rows.length <= size) return rows;
  const step = rows.length / size;
  return Array.from({ length: size }, (_, i) => rows[Math.floor(i * step)]);
}
