"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import type { Report } from "@/lib/pipeline/reports";
import { isHazard, type MapProps } from "./map-pins";

export { HAZARD_CATEGORIES, isHazard } from "./map-pins";

// Only the map that is actually used gets downloaded.
const MapboxMap = lazy(() => import("./mapbox-map"));
const LeafletMap = lazy(() => import("./leaflet-map"));

/** Public by design: Mapbox tokens are browser tokens. */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Filters to what belongs on the map, then hands off to Mapbox or the Leaflet fallback. */
export default function MapView({
  reports,
  affectedOnly,
  hazards,
  ...rest
}: Omit<MapProps, "reports"> & {
  reports: Report[];
  affectedOnly: boolean;
  hazards: boolean;
}) {
  // A bad or revoked token drops back to Leaflet instead of a blank map.
  const [mapboxFailed, setMapboxFailed] = useState(false);

  const plotted = useMemo(() => {
    const located = reports.filter((r) => r.place);
    const visible = located.filter((r) => {
      // The hazard layer is a separate toggle, not an urgency pin.
      if (isHazard(r)) return hazards;
      if (!affectedOnly) return true;
      return r.result.places[0]?.role === "affected";
    });
    // If this event's places are all "mentioned" or "help_from", showing them
    // beats an empty map; the toggle still explains what is on screen.
    return visible.length === 0 && located.length > 0 ? located : visible;
  }, [reports, affectedOnly, hazards]);

  const props = { ...rest, reports: plotted };
  return (
    <Suspense fallback={<div className="h-full w-full bg-[#05070d]" />}>
      {MAPBOX_TOKEN && !mapboxFailed ? (
        <MapboxMap {...props} token={MAPBOX_TOKEN} onAuthError={() => setMapboxFailed(true)} />
      ) : (
        <LeafletMap {...props} />
      )}
    </Suspense>
  );
}
