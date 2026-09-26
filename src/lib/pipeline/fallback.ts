import type { Classified, Profile } from "@/lib/ai/schema";
import type { CleanRow } from "./clean";

/**
 * No AI. Used when the API errors or the quota runs out, so the app never
 * dead-ends in front of a judge. The interface shows "Quick sort — not AI
 * checked" whenever these results are on screen.
 *
 * Event-specific signal comes from the confirmed event brief, not from a
 * hardcoded flood vocabulary, so this still works on the judges' unseen CSV.
 */

const CRISIS_LEXICON = [
  "evacuat", "rescue", "stranded", "trapped", "emergency", "shelter", "flood", "fire",
  "damage", "destroyed", "collapse", "closed", "road", "bridge", "highway", "power",
  "outage", "water", "warning", "alert", "danger", "missing", "relief", "donat",
  "volunteer", "sandbag", "storm", "wind", "quake", "tornado", "blast", "explosion",
];

const CRITICAL_WORDS = ["rescue", "trapped", "stranded", "missing", "collapse", "emergency", "danger"];
const URGENT_WORDS = ["evacuat", "shelter", "closed", "road", "bridge", "highway", "warning", "alert"];

const NOISE_WORDS = ["#job", "#hiring", "#jobs", "apply now", "hiring", "career", "coupon", "giveaway"];

function score(text: string, hashtags: string[]): number {
  const lower = text.toLowerCase();
  if (NOISE_WORDS.some((w) => lower.includes(w))) return -1;

  let points = 0;
  for (const tag of hashtags) if (lower.includes(tag.toLowerCase())) points += 2;
  for (const word of CRISIS_LEXICON) if (lower.includes(word)) points += 1;
  return points;
}

function urgencyFor(text: string): Classified["urg"] {
  const lower = text.toLowerCase();
  if (CRITICAL_WORDS.some((w) => lower.includes(w))) return "critical";
  if (URGENT_WORDS.some((w) => lower.includes(w))) return "urgent";
  return "information";
}

/** Only matches place names the event brief already told us about — never invents one. */
function findPlaces(text: string, keyPlaces: string[]): Classified["places"] {
  const lower = text.toLowerCase();
  return keyPlaces
    .filter((place) => lower.includes(place.toLowerCase()))
    .slice(0, 3)
    .map((place) => {
      const at = lower.indexOf(place.toLowerCase());
      return {
        text: text.slice(at, at + place.length),
        name: place,
        type: "city" as const,
        role: "mentioned" as const,
      };
    });
}

export function quickSort(rows: CleanRow[], profile: Profile): Classified[] {
  return rows.map((row, i) => {
    const points = score(row.clean_text, profile.key_hashtags);
    const relevant = points >= 2;
    return {
      i,
      rel: relevant,
      conf: "l" as const,
      why: "Keyword match, not AI checked",
      cat: relevant ? ("Other related" as const) : ("Other related" as const),
      urg: relevant ? urgencyFor(row.clean_text) : ("information" as const),
      eye: false,
      claim: false,
      places: relevant ? findPlaces(row.clean_text, profile.key_places) : [],
      needs: [],
      src: "unknown" as const,
    };
  });
}

export const FALLBACK_BANNER = "Quick sort — not AI checked";
