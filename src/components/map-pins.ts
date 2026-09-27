import type { Report } from "@/lib/pipeline/reports";

/**
 * Pins carry two signals at once, per BRAND.md:
 *   colour  = urgency   (critical red / urgent amber / information blue)
 *   style   = confidence (high solid / medium outlined / low dimmed)
 * Colour never means anything on its own — the report card spells both out in words.
 * Shared by the Mapbox and Leaflet maps so both draw identical pins.
 */

export const URGENCY_FILL = {
  critical: "#DC2626",
  urgent: "#F59E0B",
  information: "#3B82F6",
} as const;

export const URGENCY_STROKE = {
  critical: "#991B1B",
  urgent: "#B45309",
  information: "#1E40AF",
} as const;

/** lucide-react glyph paths, one per category, drawn inside the pin. */
const CATEGORY_PATHS: Record<string, string> = {
  "Flooding or damage":
    "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1",
  "Road or bridge closed": "M4 19l4-14M16 5l4 14M12 5v3M12 12v3M12 19v1",
  "Evacuation or shelter": "M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  "People needing help": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 8v5M12 17h.01",
  "Official warning or update": "M10.3 3.3a2 2 0 0 1 3.4 0l8 14a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3zM12 9v4M12 17h.01",
  "Power water and services": "M13 2L3 14h8l-1 8 10-12h-8z",
  "Donations and volunteers": "M20.8 5.6a5 5 0 0 0-7-.2l-1.8 1.7-1.8-1.7a5 5 0 1 0-6.8 7.3l8.6 8.2 8.6-8.2a5 5 0 0 0 .2-7.1z",
  "Support and sympathy": "M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l2-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z",
  "Other related": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
};

/** Roads, bridges and utilities — what stops a responder or an evacuee getting through. */
export const HAZARD_CATEGORIES = ["Road or bridge closed", "Power water and services"];
export const isHazard = (r: Report) => HAZARD_CATEGORIES.includes(r.result.cat);

/** Hazards are a triangle in near-black, so they never read as an urgency pin. */
export function hazardHtml(report: Report): string {
  const conf = report.result.conf;
  const opacity = conf === "h" ? 1 : conf === "m" ? 0.75 : 0.4;
  return `<span style="display:flex;align-items:center;justify-content:center;
      width:26px;height:26px;opacity:${opacity};
      filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M12 3 L22.5 21 L1.5 21 Z" fill="#1A1A18" stroke="#FFFCF7" stroke-width="1.5"
              stroke-linejoin="round"/>
        <path d="M12 9.5v4.5M12 17.2h.01" stroke="#FFFCF7" stroke-width="2"
              stroke-linecap="round"/>
      </svg>
    </span>`;
}

export function pinHtml(report: Report, flagged: boolean): string {
  const urg = report.result.urg;
  const conf = report.result.conf;
  const role = report.result.places[0]?.role ?? "mentioned";
  const fill = URGENCY_FILL[urg];
  const stroke = URGENCY_STROKE[urg];
  const path = CATEGORY_PATHS[report.result.cat] ?? CATEGORY_PATHS["Other related"];

  // high = solid, medium = outlined, low = dimmed
  const background = conf === "m" ? "#FFFCF7" : fill;
  const glyph = conf === "m" ? stroke : "#FFFFFF";
  const borderWidth = conf === "m" ? 2 : 1.5;

  // Role rides on top of urgency colour: aid origins are dashed, passing
  // mentions are faded, so "Edmonton sent help" never reads as "Edmonton flooded".
  const borderStyle = role === "help_from" ? "dashed" : "solid";
  const roleOpacity = role === "mentioned" ? 0.4 : 1;
  const confOpacity = conf === "h" ? 1 : conf === "m" ? 0.75 : 0.4;
  const opacity = confOpacity * roleOpacity;

  return `<span style="
      display:flex;align-items:center;justify-content:center;
      width:26px;height:26px;border-radius:9999px;
      background:${background};border:${borderWidth}px ${borderStyle} ${stroke};
      opacity:${opacity};box-shadow:0 1px 2px rgba(0,0,0,.28);position:relative;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${glyph}"
           stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
        <path d="${path}"/>
      </svg>
      ${
        flagged
          ? `<span style="position:absolute;top:-3px;right:-3px;width:10px;height:10px;
               border-radius:9999px;background:#1A1A18;border:1.5px solid #FFFCF7;"></span>`
          : ""
      }
    </span>`;
}

export const pinClassName = (r: Report) =>
  r.result.urg === "critical" ? "lfm-pin lfm-pin-critical" : "lfm-pin";

/**
 * Many reports name the same city, so their coordinates are identical. A tiny
 * deterministic offset keeps clusters from exploding into a starburst of
 * perfectly stacked pins.
 */
export function jittered(r: Report): { lat: number; lng: number } {
  const seed = [...r.report_id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = 0.0012;
  return {
    lat: r.place!.lat + (((seed % 17) / 17) - 0.5) * jitter,
    lng: r.place!.lng + ((((seed * 7) % 19) / 19) - 0.5) * jitter,
  };
}

export type MapProps = {
  /** Already filtered to what should be on the map; every report has a place. */
  reports: Report[];
  flagged: Set<string>;
  bbox?: [number, number, number, number];
  onSelect: (id: string) => void;
};
