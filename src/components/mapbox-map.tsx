"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Report } from "@/lib/pipeline/reports";
import {
  URGENCY_FILL,
  hazardHtml,
  isHazard,
  jittered,
  pinClassName,
  pinHtml,
  type MapProps,
} from "./map-pins";

const SOURCE = "reports";

/**
 * Clusters are GPU-drawn layers, so thousands of reports stay smooth. Individual
 * pins are HTML markers, created only for points currently unclustered on screen,
 * so they keep the exact urgency/confidence/role styling from map-pins.
 */
export default function MapboxMap({
  reports,
  flagged,
  bbox,
  onSelect,
  padding,
  selectedId,
  token,
  onAuthError,
}: MapProps & { token: string; onAuthError: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [ready, setReady] = useState(false);

  // Event handlers live on the map for its whole life; refs keep them current.
  const byId = useRef(new Map<string, Report>());
  const flaggedRef = useRef(flagged);
  const onSelectRef = useRef(onSelect);
  const onAuthErrorRef = useRef(onAuthError);
  const selectedRef = useRef(selectedId);
  useEffect(() => {
    selectedRef.current = selectedId;
    flaggedRef.current = flagged;
    onSelectRef.current = onSelect;
    onAuthErrorRef.current = onAuthError;
  });

  const userMoved = useRef(false);

  useEffect(() => {
    if (!container.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/standard",
      // Faded keeps the basemap coloured but quiet, so urgency pins still stand out.
      config: {
        basemap: { theme: "faded", lightPreset: "day", showPointOfInterestLabels: false },
      },
      center: [-98, 56],
      zoom: 3,
      // The floating panels own the bottom-left and bottom-right corners, so the
      // logo and attribution (both required by Mapbox) move to the top right.
      logoPosition: "top-right",
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-right");
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("error", (e) => {
      const status = (e.error as { status?: number } | undefined)?.status;
      if (status === 401 || status === 403) onAuthErrorRef.current();
    });

    // Only a person's drag or zoom counts; our own fitBounds must not.
    const stop = (e: object) => {
      if ("originalEvent" in e && e.originalEvent) userMoved.current = true;
    };
    map.on("dragstart", stop);
    map.on("zoomstart", stop);

    map.on("load", () => {
      map.addSource(SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 60,
        // Matches the old disableClusteringAtZoom: 15.
        clusterMaxZoom: 14,
        // Count urgencies inside each cluster so its colour says the worst thing in it.
        clusterProperties: {
          critical: ["+", ["case", ["==", ["get", "urg"], "critical"], 1, 0]],
          urgent: ["+", ["case", ["==", ["get", "urg"], "urgent"], 1, 0]],
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "case",
            [">", ["get", "critical"], 0],
            URGENCY_FILL.critical,
            [">", ["get", "urgent"], 0],
            URGENCY_FILL.urgent,
            URGENCY_FILL.information,
          ],
          "circle-radius": ["step", ["get", "point_count"], 15, 25, 19, 100, 24, 500, 30],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "rgba(255,255,255,0.85)",
          "circle-opacity": 0.92,
          "circle-emissive-strength": 1,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#FFFFFF", "text-emissive-strength": 1 },
      });

      map.on("click", "clusters", (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const center = feature.geometry.coordinates as [number, number];
        const source = map.getSource(SOURCE) as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(feature.properties?.cluster_id, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({ center, zoom });
        });
      });
      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));

      setReady(true);
    });

    // HTML pins for whatever is unclustered and on screen right now.
    const markers = new Map<string, { marker: mapboxgl.Marker; html: string }>();
    map.on("render", () => {
      if (!map.getSource(SOURCE) || !map.isSourceLoaded(SOURCE)) return;
      const seen = new Set<string>();
      for (const f of map.querySourceFeatures(SOURCE, {
        filter: ["!", ["has", "point_count"]],
      })) {
        const id = f.properties?.id as string | undefined;
        const r = id ? byId.current.get(id) : undefined;
        if (!id || !r || seen.has(id) || f.geometry.type !== "Point") continue;
        seen.add(id);

        const hazard = isHazard(r);
        const html = hazard ? hazardHtml(r) : pinHtml(r, flaggedRef.current.has(id));
        const existing = markers.get(id);
        if (existing?.html === html) {
          existing.marker.getElement().classList.toggle("lfm-selected", id === selectedRef.current);
          continue;
        }
        existing?.marker.remove();

        const lngLat = f.geometry.coordinates as [number, number];
        const el = document.createElement("div");
        el.className = hazard ? "lfm-hazard" : pinClassName(r);
        el.classList.toggle("lfm-selected", id === selectedRef.current);
        el.style.cursor = "pointer";
        el.title = r.result.places[0]?.name ?? id;
        el.innerHTML = html;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onSelectRef.current(id);
        });
        const marker = new mapboxgl.Marker({ element: el, offset: hazard ? [0, -2] : [0, 0] })
          .setLngLat(lngLat)
          .addTo(map);
        markers.set(id, { marker, html });
      }
      for (const [id, { marker }] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    });

    // The map fills the window; keep the canvas in step with it.
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [token]);

  // Only push new data when the pins actually change, not on unrelated re-renders.
  const lastSignature = useRef("");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const signature = reports
      .map((r) => `${r.report_id}${flagged.has(r.report_id) ? "!" : ""}`)
      .join(",");
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;

    byId.current = new Map(reports.map((r) => [r.report_id, r]));
    (map.getSource(SOURCE) as mapboxgl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: reports.map((r) => {
        const { lat, lng } = jittered(r);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          // Hazards are not urgency pins, so they must not colour a cluster.
          properties: { id: r.report_id, urg: isHazard(r) ? "hazard" : r.result.urg },
        };
      }),
    });
    // Flag changes alter pin HTML without moving anything; force a render pass.
    map.triggerRepaint();
  }, [reports, flagged, ready]);

  // Floating panels cover part of the map; padding shifts the visual centre into
  // the space that is actually visible, so fly-tos and fits land in view.
  const paddingKey = padding ? `${padding.top},${padding.right},${padding.bottom},${padding.left}` : "";
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !padding) return;
    map.easeTo({ padding, duration: 350 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the numbers, not the object
  }, [paddingKey, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const r = byId.current.get(selectedId);
    if (!r?.place) return;
    const { lat, lng } = jittered(r);
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), duration: 1500 });
    userMoved.current = true;
    map.triggerRepaint();
  }, [selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !bbox || userMoved.current) return;
    map.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 40, maxZoom: 11, duration: 0 },
    );
    userMoved.current = true;
  }, [bbox, ready]);

  return <div ref={container} className="h-full w-full" />;
}
