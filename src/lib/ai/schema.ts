import { z } from "zod";

/**
 * One source of truth for every AI task. The compact keys (i, rel, conf...) are
 * what the model returns; the long names live in the export columns.
 * Nothing here is specific to floods or to Alberta — event-specific values come
 * from the profile task at runtime, so the judges' unseen CSV works too.
 */

export const CATEGORIES = [
  "Flooding or damage",
  "Road or bridge closed",
  "Evacuation or shelter",
  "People needing help",
  "Official warning or update",
  "Power water and services",
  "Donations and volunteers",
  "Support and sympathy",
  "Other related",
] as const;

export const URGENCIES = ["critical", "urgent", "information"] as const;
export const CONFIDENCES = ["h", "m", "l"] as const;
export const SOURCE_TYPES = ["resident", "official", "media", "organization", "unknown"] as const;
export const PLACE_TYPES = ["street", "neighbourhood", "city", "town", "region", "landmark", "community", "other"] as const;
export const PLACE_ROLES = ["affected", "help_from", "mentioned"] as const;
export const TIME_TYPES = ["now", "past", "forecast"] as const;

export const CLAIM_TYPES = [
  "dam_status",
  "evacuation_order",
  "road_closure",
  "shelter_capacity",
  "river_level",
  "other_official",
] as const;

export const VERIFICATION_STATUSES = ["verified", "unverified", "contradicts", "cannot_check"] as const;

export const REVIEW_STATUSES = ["AI draft", "flagged", "corrected", "published"] as const;

export const zCategory = z.enum(CATEGORIES);
export const zUrgency = z.enum(URGENCIES);
export const zConfidence = z.enum(CONFIDENCES);
export const zSourceType = z.enum(SOURCE_TYPES);
export const zPlaceType = z.enum(PLACE_TYPES);
export const zPlaceRole = z.enum(PLACE_ROLES);

/** Task 1 — profile. 150 sampled tweets in, an editable event brief out. */
export const zProfile = z.object({
  event_type: z.string(),
  event_name: z.string(),
  region: z.string(),
  country: z.string(),
  /** [west, south, east, north] — decides inside vs outside the affected zone. */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  key_hashtags: z.array(z.string()),
  key_places: z.array(z.string()),
  what_counts_as_related: z.string(),
  confidence: zConfidence,
});
export type Profile = z.infer<typeof zProfile>;

/** Task 2 — classify. One object per tweet in the batch. */
export const zPlaceMention = z.object({
  /** Must be copied verbatim from the tweet — this powers the highlighted evidence. */
  text: z.string(),
  name: z.string(),
  type: zPlaceType,
  role: zPlaceRole,
});

export const zClassified = z.object({
  i: z.number().int().nonnegative(),
  rel: z.boolean(),
  conf: zConfidence,
  why: z.string().optional(),
  cat: zCategory,
  urg: zUrgency,
  eye: z.boolean(),
  claim: z.boolean(),
  places: z.array(zPlaceMention).default([]),
  time: z.object({ text: z.string(), type: z.enum(TIME_TYPES) }).optional(),
  who: z.string().optional(),
  needs: z.array(z.string()).default([]),
  src: zSourceType,
  fn: z.string().optional(),
});
export type Classified = z.infer<typeof zClassified>;
export const zClassifyBatch = z.object({ results: z.array(zClassified) });

/** Task 3 — places. Unique place names in, coordinates out. */
export const zResolvedPlace = z.object({
  name: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  precision: zPlaceType,
  inside_region: z.boolean(),
  confidence: zConfidence,
});
export type ResolvedPlace = z.infer<typeof zResolvedPlace>;
export const zPlacesResult = z.object({ places: z.array(zResolvedPlace) });

/** Task 4 — brief. Reads the current filter, leads with the critical count. */
export const zBrief = z.object({
  critical_count: z.number().int().nonnegative(),
  headline: z.string(),
  worst_areas: z.array(z.string()),
  roads_and_bridges: z.array(z.string()),
  evacuations: z.array(z.string()),
  needs: z.array(z.string()),
  first_nations_affected: z.array(z.string()),
  summary: z.string(),
  cited_report_ids: z.array(z.string()),
});
export type Brief = z.infer<typeof zBrief>;

/** Task 5 — verify. Only for tweets that claim something about official status. */
export const zVerification = z.object({
  i: z.number().int().nonnegative(),
  claim_type: z.enum(CLAIM_TYPES),
  expected_source: z.string(),
  expected_source_url: z.string(),
  verification_status: z.enum(VERIFICATION_STATUSES),
  confidence: zConfidence,
  note: z.string().optional(),
});
export type Verification = z.infer<typeof zVerification>;
export const zVerifyResult = z.object({ verifications: z.array(zVerification) });

/** Evacuation route card. Inside/outside comes from the profile bbox. */
export const zRoute = z.object({
  from: z.string(),
  to: z.string(),
  to_kind: z.string(),
  distance_km: z.number(),
  drive_time: z.string(),
  via: z.string(),
  shelter: z.string(),
  note: z.string().optional(),
});
export type Route = z.infer<typeof zRoute>;
export const zRoutesResult = z.object({ routes: z.array(zRoute) });

export type AiTask = "profile" | "classify" | "places" | "brief" | "verify" | "routes";

/** Validate a task response. Invalid items go to review rather than being guessed at. */
export function validate(task: AiTask, data: unknown) {
  switch (task) {
    case "profile":
      return zProfile.parse(data);
    case "classify":
      return zClassifyBatch.parse(data);
    case "places":
      return zPlacesResult.parse(data);
    case "brief":
      return zBrief.parse(data);
    case "verify":
      return zVerifyResult.parse(data);
    case "routes":
      return zRoutesResult.parse(data);
  }
}
