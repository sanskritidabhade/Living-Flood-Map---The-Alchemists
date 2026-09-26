import type { Report } from "./reports";

/**
 * Two reports about the same place that cannot both be true — "bridge is open"
 * against "bridge washed out". Runs on already-classified data, so it costs no
 * AI calls, and it is deliberately conservative: a false contradiction wastes a
 * responder's attention, which is the thing we are trying to save.
 */

type Axis = { name: string; positive: RegExp; negative: RegExp; reason: string };

const AXES: Axis[] = [
  {
    name: "road",
    positive: /\b(road|highway|route|street)s?\b[^.!?]{0,40}\b(open|clear|passable|reopened|fine)\b/i,
    negative: /\b(road|highway|route|street)s?\b[^.!?]{0,40}\b(closed|flooded|washed out|impassable|under water|cut off|blocked)\b/i,
    reason: "One report says roads are open, another says they are closed or flooded",
  },
  {
    name: "bridge",
    positive: /\bbridge\b[^.!?]{0,40}\b(open|safe|standing|passable|fine)\b/i,
    negative: /\bbridge\b[^.!?]{0,40}\b(closed|out|washed out|collapsed|gone|damaged|unsafe)\b/i,
    reason: "One report says the bridge is open, another says it is out",
  },
  {
    name: "shelter",
    positive: /\b(shelter|reception centre|reception center|evacuation centre|evacuation center)\b[^.!?]{0,40}\b(open|accepting|space|room available)\b/i,
    negative: /\b(shelter|reception centre|reception center|evacuation centre|evacuation center)\b[^.!?]{0,40}\b(full|closed|turning (people |evacuees )?away|at capacity)\b/i,
    reason: "One report says the reception centre is open, another says it is full or closed",
  },
  {
    name: "water",
    positive: /\bwater\b[^.!?]{0,40}\b(receding|going down|dropped|subsiding|lower)\b/i,
    negative: /\bwater\b[^.!?]{0,40}\b(rising|climbing|higher|still coming up)\b/i,
    reason: "One report says water is receding, another says it is still rising",
  },
  {
    name: "evacuation",
    positive: /\b(evacuation (order|alert))\b[^.!?]{0,40}\b(lifted|rescinded|cancelled|canceled|over)\b/i,
    negative: /\b(evacuation (order|alert))\b[^.!?]{0,40}\b(issued|in effect|mandatory|expanded)\b/i,
    reason: "One report says the evacuation order is lifted, another says it is in effect",
  },
];

const normalizePlace = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type Contradiction = { reason: string; withIds: string[] };

/** report_id -> what it conflicts with. */
export function findContradictions(reports: Report[]): Map<string, Contradiction> {
  const byPlace = new Map<string, Report[]>();
  for (const r of reports) {
    if (!r.result.rel) continue;
    const place = r.result.places[0]?.name;
    if (!place) continue;
    const key = normalizePlace(place);
    const group = byPlace.get(key);
    if (group) group.push(r);
    else byPlace.set(key, [r]);
  }

  const found = new Map<string, Contradiction>();

  for (const group of byPlace.values()) {
    if (group.length < 2) continue;
    for (const axis of AXES) {
      const positives = group.filter((r) => axis.positive.test(r.clean_text));
      const negatives = group.filter((r) => axis.negative.test(r.clean_text));
      if (positives.length === 0 || negatives.length === 0) continue;

      const record = (r: Report, others: Report[]) => {
        const existing = found.get(r.report_id);
        const withIds = [...new Set([...(existing?.withIds ?? []), ...others.map((o) => o.report_id)])];
        found.set(r.report_id, { reason: existing?.reason ?? axis.reason, withIds });
      };
      for (const p of positives) record(p, negatives);
      for (const n of negatives) record(n, positives);
    }
  }

  return found;
}
