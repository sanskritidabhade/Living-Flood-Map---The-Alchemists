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
export const zEvacuationResult = z.object({ routes: z.array(zRoute) });

export type AiTask =
  | "profile"
  | "classify"
  | "places"
  | "brief"
  | "verify"
  | "evacuation"
  | "ask";

/** Task 7 — ask. An analyst question answered only from the loaded reports. */
export const zAnswer = z.object({
  answer: z.string(),
  cited_report_ids: z.array(z.string()).default([]),
  /** False when the reports do not contain the answer — never guess. */
  grounded: z.boolean(),
});
export type Answer = z.infer<typeof zAnswer>;

/**
 * Sent as the organizers' `response_schema` option so the model returns JSON we
 * can parse. Kept in step with the zod schemas above — zod is still the gate,
 * this just makes a valid response far more likely.
 */
const str = { type: "string" } as const;
const num = { type: "number" } as const;
const bool = { type: "boolean" } as const;
const strArray = { type: "array", items: str } as const;
const confidence = { type: "string", enum: [...CONFIDENCES] } as const;

const PLACE_MENTION = {
  type: "object",
  properties: {
    text: str,
    name: str,
    type: { type: "string", enum: [...PLACE_TYPES] },
    role: { type: "string", enum: [...PLACE_ROLES] },
  },
  required: ["text", "name", "type", "role"],
} as const;

export const RESPONSE_SCHEMAS: Record<AiTask, object> = {
  profile: {
    type: "object",
    properties: {
      event_type: str,
      event_name: str,
      region: str,
      country: str,
      bbox: { type: "array", items: num },
      key_hashtags: strArray,
      key_places: strArray,
      what_counts_as_related: str,
      confidence,
    },
    required: [
      "event_type",
      "event_name",
      "region",
      "country",
      "bbox",
      "key_hashtags",
      "key_places",
      "what_counts_as_related",
      "confidence",
    ],
  },
  classify: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            i: { type: "integer" },
            rel: bool,
            conf: confidence,
            why: str,
            cat: { type: "string", enum: [...CATEGORIES] },
            urg: { type: "string", enum: [...URGENCIES] },
            eye: bool,
            claim: bool,
            places: { type: "array", items: PLACE_MENTION },
            time: {
              type: "object",
              properties: { text: str, type: { type: "string", enum: [...TIME_TYPES] } },
              required: ["text", "type"],
            },
            who: str,
            needs: strArray,
            src: { type: "string", enum: [...SOURCE_TYPES] },
            fn: str,
          },
          required: ["i", "rel", "conf", "cat", "urg", "eye", "claim", "places", "needs", "src"],
        },
      },
    },
    required: ["results"],
  },
  places: {
    type: "object",
    properties: {
      places: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: str,
            lat: num,
            lng: num,
            precision: { type: "string", enum: [...PLACE_TYPES] },
            inside_region: bool,
            confidence,
          },
          required: ["name", "lat", "lng", "precision", "inside_region", "confidence"],
        },
      },
    },
    required: ["places"],
  },
  brief: {
    type: "object",
    properties: {
      critical_count: { type: "integer" },
      headline: str,
      worst_areas: strArray,
      roads_and_bridges: strArray,
      evacuations: strArray,
      needs: strArray,
      first_nations_affected: strArray,
      summary: str,
      cited_report_ids: strArray,
    },
    required: [
      "critical_count",
      "headline",
      "worst_areas",
      "roads_and_bridges",
      "evacuations",
      "needs",
      "first_nations_affected",
      "summary",
      "cited_report_ids",
    ],
  },
  verify: {
    type: "object",
    properties: {
      verifications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            i: { type: "integer" },
            claim_type: { type: "string", enum: [...CLAIM_TYPES] },
            expected_source: str,
            expected_source_url: str,
            verification_status: { type: "string", enum: [...VERIFICATION_STATUSES] },
            confidence,
            note: str,
          },
          required: [
            "i",
            "claim_type",
            "expected_source",
            "expected_source_url",
            "verification_status",
            "confidence",
          ],
        },
      },
    },
    required: ["verifications"],
  },
  ask: {
    type: "object",
    properties: {
      answer: str,
      cited_report_ids: strArray,
      grounded: bool,
    },
    required: ["answer", "cited_report_ids", "grounded"],
  },
  evacuation: {
    type: "object",
    properties: {
      routes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: str,
            to: str,
            to_kind: str,
            distance_km: num,
            drive_time: str,
            via: str,
            shelter: str,
            note: str,
          },
          required: ["from", "to", "to_kind", "distance_km", "drive_time", "via", "shelter"],
        },
      },
    },
    required: ["routes"],
  },
};

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
    case "evacuation":
      return zEvacuationResult.parse(data);
    case "ask":
      return zAnswer.parse(data);
  }
}
