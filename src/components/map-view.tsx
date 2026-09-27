"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import { Loader2, MapPinOff } from "lucide-react";
import type { Report } from "@/lib/pipeline/reports";
import { isHazard } from "./map-pins";

export { HAZARD_CATEGORIES, isHazard } from "./map-pins";

// Only the map that is actually used gets downloaded.
const MapboxMap = lazy(() => import("./mapbox-map"));
const LeafletMap = lazy(() => import("./leaflet-map"));

/** Public by design: Mapbox tokens are browser tokens. Restrict it by URL in the Mapbox dashboard. */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export default function MapView({
  reports,
  flagged,
  affectedOnly,
  bbox,
  hazards,
  stillSorting,
  onSelect,
}: {
  reports: Report[];
  flagged: Set<string>;
  affectedOnly: boolean;
  bbox?: [number, number, number, number];
  hazards: boolean;
  /** True while batches are still arriving — changes what an empty map means. */
  stillSorting?: boolean;
  onSelect: (id: string) => void;
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
    // Never show an empty map when we do have coordinates: if this event's
    // places are all "mentioned" or "help_from", showing them beats showing
    // nothing, and the toggle still explains what is on screen.
    return visible.length === 0 && located.length > 0 ? located : visible;
  }, [reports, affectedOnly, hazards]);

  // An empty state is better than a blank grey box.
  if (plotted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted px-6 text-center">
        {stillSorting ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            <p className="font-semibold">Working out where these reports are</p>
            <p className="max-w-[42ch] text-sm text-muted-foreground">
              Pins appear as soon as the first places are resolved. The reports are already
              listed on the right.
            </p>
          </>
        ) : (
          <>
            <MapPinOff className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="font-semibold">No locations found in this dataset</p>
            <p className="max-w-[40ch] text-sm text-muted-foreground">
              The reports are still listed and exported. Turn off &ldquo;Affected areas only&rdquo;
              if places were mentioned but not hit.
            </p>
          </>
        )}
      </div>
    );
  }

  const props = { reports: plotted, flagged, bbox, onSelect };
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center rounded-md bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      }
    >
      {MAPBOX_TOKEN && !mapboxFailed ? (
        <MapboxMap {...props} token={MAPBOX_TOKEN} onAuthError={() => setMapboxFailed(true)} />
      ) : (
        <LeafletMap {...props} />
      )}
    </Suspense>
  );
}
