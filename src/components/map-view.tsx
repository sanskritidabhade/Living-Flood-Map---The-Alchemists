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
    className: "lfm-pin",
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
  onSelect,
}: {
  reports: Report[];
  flagged: Set<string>;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const fitted = useRef(false);

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

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();

    const markers = reports
      .filter((r) => r.place)
      .map((r) => {
        const marker = L.marker([r.place!.lat, r.place!.lng], {
          icon: pinIcon(r, flagged.has(r.report_id)),
          title: r.result.places[0]?.name ?? r.report_id,
        });
        marker.on("click", () => onSelect(r.report_id));
        return marker;
      });

    cluster.addLayers(markers);

    // Frame the data once, then leave the view alone so pins can stream in.
    if (!fitted.current && markers.length > 0) {
      map.fitBounds(cluster.getBounds().pad(0.2));
      fitted.current = true;
    }
  }, [reports, flagged, map, onSelect, clusterReady]);

  return null;
}

export default function MapView({
  reports,
  flagged,
  affectedOnly,
  onSelect,
}: {
  reports: Report[];
  flagged: Set<string>;
  affectedOnly: boolean;
  onSelect: (id: string) => void;
}) {
  const plotted = useMemo(
    () =>
      reports.filter((r) => {
        if (!r.place) return false;
        if (!affectedOnly) return true;
        return r.result.places[0]?.role === "affected";
      }),
    [reports, affectedOnly],
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
      scrollWheelZoom
      className="h-full w-full rounded-md"
      style={{ background: "#F5F0E8" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <Pins reports={plotted} flagged={flagged} onSelect={onSelect} />
    </MapContainer>
  );
}
