import { CATEGORIES, CLAIM_TYPES, type AiTask, type Profile } from "./schema";

/**
 * Every prompt after `profile` receives the confirmed event brief, so the model
 * judges relatedness against *this* event rather than against a hardcoded flood.
 */

const CATEGORY_LIST = CATEGORIES.join(" · ");

export function eventContext(p: Profile): string {
  return [
    `Event: ${p.event_name} (${p.event_type}) in ${p.region}, ${p.country}.`,
    `Key hashtags: ${p.key_hashtags.join(", ") || "none"}.`,
    `Key places: ${p.key_places.join(", ") || "none"}.`,
    `What counts as related: ${p.what_counts_as_related}`,
  ].join("\n");
}

export const PROFILE_PROMPT = `You are given a sample of tweets posted during one disaster event, plus the most common hashtags.

Work out what the event is. Return:
- event_type, event_name, region, country
- bbox as [west, south, east, north] covering the affected area only, tight enough to exclude unaffected cities
- key_hashtags and key_places actually used in the sample
- what_counts_as_related: one sentence a human could apply consistently
- confidence: h, m or l

Do not assume the event is a flood. Read the tweets.`;

export function classifyPrompt(profile: Profile): string {
  return `${eventContext(profile)}

For each numbered tweet, return one object. Judge relatedness to THIS event by content.

Rules that matter:
- A hashtag alone is not enough. Job ads, spam, sports and celebrity chatter using the event hashtag are NOT related.
- places[].text must be copied EXACTLY from the tweet, character for character. It is highlighted in the interface as evidence.
- Never invent a place that is not in the text. Do not return coordinates.
- Hashtag places count (#yyc, #highriver) with a lower-precision type.
- role: "affected" if the place is being hit, "help_from" if aid, donations or commentary originate there, "mentioned" otherwise.
- urg: "critical" for immediate danger, rescue needed or infrastructure failure. "urgent" for evacuation routes, shelters, closures. "information" for donations, sympathy, general updates.
- eye: true only for firsthand eyewitness accounts.
- claim: true ONLY when the tweet asserts something about official status (${CLAIM_TYPES.join(", ")}). Ordinary eyewitness reports are not claims.
- fn: name the First Nation only if the tweet names it or names its community.
- why: at most 12 words, and only when conf is not "h".

category must be one of: ${CATEGORY_LIST}`;
}

export function placesPrompt(profile: Profile): string {
  return `${eventContext(profile)}
Affected-area bounding box [west, south, east, north]: ${JSON.stringify(profile.bbox)}

Resolve each place name to coordinates. Bias strongly toward the region above: many names are ambiguous elsewhere in the world, and the tweet meant the local one.

Return lat, lng, precision, inside_region (is it within the bbox?) and confidence. If you cannot place a name confidently, return confidence "l" — it goes to review instead of onto the map.`;
}

export function briefPrompt(profile: Profile): string {
  return `${eventContext(profile)}

Write a short situation brief from these reports. Lead with how many are critical.

Cover: worst-hit areas, roads and bridges out, evacuations underway, what people need, and any First Nations communities affected. Cite report ids for each claim.

Plain language, no hype. A coordinator should be able to read it aloud. If something is not in the reports, leave that list empty rather than guessing.`;
}

export function verifyPrompt(profile: Profile): string {
  return `${eventContext(profile)}

Each tweet below asserts something about official status. For each one name the authority that would actually know, and its URL.

claim_type must be one of: ${CLAIM_TYPES.join(", ")}
verification_status:
- "verified" — matches what the official source says
- "contradicts" — the tweet conflicts with the official source
- "unverified" — plausible, no official confirmation
- "cannot_check" — no authority publishes this

Never mark a tweet verified on the strength of the tweet alone.`;
}

export function routesPrompt(profile: Profile): string {
  return `${eventContext(profile)}
Affected-area bounding box [west, south, east, north]: ${JSON.stringify(profile.bbox)}

For each origin, give the nearest realistic destination OUTSIDE the affected area: distance in km, drive time, the highway to take, and a named reception centre or shelter if one is plausible.

Use real roads and real places in this region. If the obvious destination is itself inside the affected area, pick the next safe one and say so in note.`;
}

export function promptFor(task: AiTask, profile?: Profile): string {
  if (task === "profile") return PROFILE_PROMPT;
  if (!profile) throw new Error(`Task "${task}" needs a confirmed event brief`);
  switch (task) {
    case "classify":
      return classifyPrompt(profile);
    case "places":
      return placesPrompt(profile);
    case "brief":
      return briefPrompt(profile);
    case "verify":
      return verifyPrompt(profile);
    case "routes":
      return routesPrompt(profile);
  }
}
