"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { hazardHtml, isHazard, jittered, pinClassName, pinHtml, type MapProps } from "./map-pins";

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

function Pins({ reports, flagged, bbox, onSelect }: MapProps) {
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
      cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 60,
        // Inserting thousands of markers in one go freezes the browser. Chunked
        // loading yields between slices, so the map stays interactive while the
        // pins land — this is what made a large dataset feel like a hang.
        chunkedLoading: true,
        chunkInterval: 120,
        chunkDelay: 20,
        removeOutsideVisibleBounds: true,
        // A starburst of identically-placed pins reads as broken, not helpful.
        spiderfyOnMaxZoom: false,
        disableClusteringAtZoom: 15,
      });
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

  // Leaflet caches the container size at init. The Explorer panel settles to its
  // final height after that, so without this the map paints into stale
  // dimensions and comes out blank.
  useEffect(() => {
    const el = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(el);
    const t = window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      observer.disconnect();
      window.clearTimeout(t);
    };
  }, [map]);

  // Framing lives in its own effect: folding it into the marker rebuild meant
  // the early-return guard could skip it before the bounding box arrived.
  useEffect(() => {
    if (fitted.current || !clusterReady || !bbox) return;
    map.invalidateSize();
    map.fitBounds(
      L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]).pad(0.05),
      { maxZoom: 11 },
    );
    fitted.current = true;
  }, [map, bbox, clusterReady]);

  const lastSignature = useRef("");

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    // Rebuilding every marker on each render is what made the map flicker and
    // blank out while batches streamed in. Only rebuild when the pins actually
    // change, not when an unrelated bit of state does.
    const signature = `${reports
      .map((r) => `${r.report_id}${flagged.has(r.report_id) ? "!" : ""}`)
      .join(",")}`;
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;

    cluster.clearLayers();

    const markers = reports.map((r) => {
      const { lat, lng } = jittered(r);
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: isHazard(r) ? "lfm-hazard" : pinClassName(r),
          iconSize: [26, 26],
          iconAnchor: isHazard(r) ? [13, 15] : [13, 13],
          html: isHazard(r) ? hazardHtml(r) : pinHtml(r, flagged.has(r.report_id)),
        }),
        title: r.result.places[0]?.name ?? r.report_id,
      });
      marker.on("click", () => {
        onSelect(r.report_id);
        map.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
      });
      return marker;
    });

    cluster.addLayers(markers);
  }, [reports, flagged, map, onSelect, clusterReady]);

  return null;
}

/** Fallback when no Mapbox token is configured: OSM raster tiles, no account needed. */
export default function LeafletMap(props: MapProps) {
  return (
    <MapContainer
      center={[51.0447, -114.0719]}
      zoom={8}
      // Leaflet's fade-in leaves tiles stuck at opacity 0 under Turbopack; the
      // tiles load fine (HTTP 200) but never become visible. Disabling the fade
      // also stops every pan from flickering during the demo.
      fadeAnimation={false}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#05070d" }}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <Pins {...props} />
    </MapContainer>
  );
}
