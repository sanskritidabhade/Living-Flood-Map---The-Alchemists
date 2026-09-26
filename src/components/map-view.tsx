"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapPinOff } from "lucide-react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Report } from "@/lib/pipeline/reports";

/**
 * leaflet.markercluster is a pre-ESM plugin: its source refers to a bare global
 * `L`. Under Turbopack there is no such global, so a static import throws at
 * module-evaluation time and the whole map fails to mount. ESM hoisting means we
 * cannot simply assign window.L above the import — the plugin has to be pulled in
 * at runtime, after the global exists.
 */
let clusterPluginReady: Promise<void> | null = null;
function loadClusterPlugin(): Promise<void> {
  if (!clusterPluginReady) {
    (window as unknown as { L: typeof L }).L = L;
    clusterPluginReady = import("leaflet.markercluster").then(() => undefined);
  }
  return clusterPluginReady;
}

/** Next rewrites image imports, so Leaflet's default icon URLs must be set by hand. */
const iconUrl = (m: unknown) => (typeof m === "string" ? m : (m as { src: string }).src);
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: iconUrl(markerIcon),
  iconRetinaUrl: iconUrl(markerIcon2x),
  shadowUrl: iconUrl(markerShadow),
});

/**
 * Pins carry two signals at once, per BRAND.md:
 *   colour  = urgency   (critical red / urgent amber / information blue)
 *   style   = confidence (high solid / medium outlined / low dimmed)
 * Colour never means anything on its own — the report card spells both out in words.
 */

const URGENCY_FILL = {
  critical: "#DC2626",
  urgent: "#F59E0B",
  information: "#3B82F6",
} as const;

const URGENCY_STROKE = {
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
function hazardIcon(report: Report): L.DivIcon {
  const conf = report.result.conf;
  const opacity = conf === "h" ? 1 : conf === "m" ? 0.75 : 0.4;
  return L.divIcon({
    className: "lfm-hazard",
    iconSize: [26, 26],
    iconAnchor: [13, 15],
    html: `<span style="display:flex;align-items:center;justify-content:center;
        width:26px;height:26px;opacity:${opacity};
        filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M12 3 L22.5 21 L1.5 21 Z" fill="#1A1A18" stroke="#FFFCF7" stroke-width="1.5"
                stroke-linejoin="round"/>
          <path d="M12 9.5v4.5M12 17.2h.01" stroke="#FFFCF7" stroke-width="2"
                stroke-linecap="round"/>
        </svg>
      </span>`,
  });
}

function pinIcon(report: Report, flagged: boolean): L.DivIcon {
  const urg = report.result.urg;
  const conf = report.result.conf;
  const role = report.result.places[0]?.role ?? "mentioned";
  const fill = URGENCY_FILL[urg];
  const stroke = URGENCY_STROKE[urg];
  const path = CATEGORY_PATHS[report.result.cat] ?? CATEGORY_PATHS["Other related"];

  // high = solid, medium = outlined, low = dimmed
  const background = conf === "h" ? fill : conf === "m" ? "#FFFCF7" : fill;
  const glyph = conf === "m" ? stroke : "#FFFFFF";
  const borderWidth = conf === "m" ? 2 : 1.5;

  // Role rides on top of urgency colour: aid origins are dashed, passing
  // mentions are faded, so "Edmonton sent help" never reads as "Edmonton flooded".
  const borderStyle = role === "help_from" ? "dashed" : "solid";
  const roleOpacity = role === "mentioned" ? 0.4 : 1;
  const confOpacity = conf === "h" ? 1 : conf === "m" ? 0.75 : 0.4;
  const opacity = confOpacity * roleOpacity;

  return L.divIcon({
    className: urg === "critical" ? "lfm-pin lfm-pin-critical" : "lfm-pin",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<span style="
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
      </span>`,
  });
}

function Pins({
  reports,
  flagged,
  bbox,
  hazards,
  onSelect,
}: {
  reports: Report[];
  flagged: Set<string>;
  bbox?: [number, number, number, number];
  hazards: boolean;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    const stop = () => {
      fitted.current = true;
    };
    map.on("dragstart zoomstart", stop);
    return () => {
      map.off("dragstart zoomstart", stop);
    };
  }, [map]);

  const [clusterReady, setClusterReady] = useState(false);

  useEffect(() => {
    let cluster: L.MarkerClusterGroup | null = null;
    let cancelled = false;
    // react-leaflet has no v5 cluster binding, so drive the plugin directly.
    void loadClusterPlugin().then(() => {
      if (cancelled) return;
      cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
      clusterRef.current = cluster;
      map.addLayer(cluster);
      setClusterReady(true);
    });
    return () => {
      cancelled = true;
      if (cluster) map.removeLayer(cluster);
      clusterRef.current = null;
      setClusterReady(false);
    };
  }, [map]);

  const lastSignature = useRef("");

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    // Rebuilding every marker on each render is what made the map flicker and
    // blank out while batches streamed in. Only rebuild when the pins actually
    // change, not when an unrelated bit of state does.
    const signature = `${hazards}|${reports
      .map((r) => `${r.report_id}${flagged.has(r.report_id) ? "!" : ""}`)
      .join(",")}`;
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;

    cluster.clearLayers();

    const markers = reports
      .filter((r) => r.place)
      .map((r) => {
        const marker = L.marker([r.place!.lat, r.place!.lng], {
          icon: isHazard(r) ? hazardIcon(r) : pinIcon(r, flagged.has(r.report_id)),
          title: r.result.places[0]?.name ?? r.report_id,
        });
        marker.on("click", () => onSelect(r.report_id));
        return marker;
      });

    cluster.addLayers(markers);

    // Frame the map exactly once. Re-fitting on every streamed batch forced a
    // full tile reload each time, which is what made the basemap disappear.
    if (!fitted.current && markers.length > 0) {
      const bounds = bbox
        ? L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]])
        : cluster.getBounds();
      map.fitBounds(bounds.pad(0.05), { maxZoom: 11 });
      fitted.current = true;
    }
  }, [reports, flagged, map, onSelect, clusterReady, bbox, hazards]);

  return null;
}

export default function MapView({
  reports,
  flagged,
  affectedOnly,
  bbox,
  hazards,
  onSelect,
}: {
  reports: Report[];
  flagged: Set<string>;
  affectedOnly: boolean;
  bbox?: [number, number, number, number];
  hazards: boolean;
  onSelect: (id: string) => void;
}) {
  const plotted = useMemo(
    () =>
      reports.filter((r) => {
        if (!r.place) return false;
        // The hazard layer is a separate toggle, not an urgency pin.
        if (isHazard(r)) return hazards;
        if (!affectedOnly) return true;
        return r.result.places[0]?.role === "affected";
      }),
    [reports, affectedOnly, hazards],
  );

  // Leaflet needs a real viewport; an empty state is better than a blank grey box.
  if (plotted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted px-6 text-center">
        <MapPinOff className="h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="font-semibold">No locations found in this dataset</p>
        <p className="max-w-[40ch] text-sm text-muted-foreground">
          The reports are still listed and exported. Turn off &ldquo;Affected areas only&rdquo; if
          places were mentioned but not hit.
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[51.0447, -114.0719]}
      zoom={8}
      // Leaflet's fade-in leaves tiles stuck at opacity 0 under Turbopack; the
      // tiles load fine (HTTP 200) but never become visible. Disabling the fade
      // also stops every pan from flickering during the demo.
      fadeAnimation={false}
      scrollWheelZoom
      className="h-full w-full rounded-md"
      style={{ background: "#F5F0E8" }}
    >
      <TileLayer
        // CARTO's Positron endpoint started demanding an API key, so use OSM
        // standard tiles: no key, no account, attribution shown as required.
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <Pins reports={plotted} flagged={flagged} bbox={bbox} hazards={hazards} onSelect={onSelect} />
    </MapContainer>
  );
}
