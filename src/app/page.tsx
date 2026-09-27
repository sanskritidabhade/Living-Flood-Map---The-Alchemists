"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { ChatWidget } from "@/components/chat-widget";
import { ControlPane } from "@/components/control-pane";
import { applyFilters, EMPTY_FILTERS, type Filters } from "@/lib/pipeline/reports";
import { useFloodMap } from "@/lib/use-flood-map";
import { useMapPadding } from "@/lib/use-map-padding";

/** Mapbox GL and Leaflet both touch window on import, so the map is never server-rendered. */
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#05070d]" />,
});

export default function Home() {
  const app = useFloodMap();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [hazards, setHazards] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const pane = useRef<HTMLElement>(null);
  const chat = useRef<HTMLDivElement>(null);
  const padding = useMapPadding([pane, chat], [app.step, chatOpen]);

  const visible = useMemo(() => applyFilters(app.reports, filters), [app.reports, filters]);

  const reset = () => {
    app.reset();
    setFilters(EMPTY_FILTERS);
    setSelectedId(null);
    setChatOpen(false);
  };

  return (
    <main className="fixed inset-0">
      <div className="absolute inset-0">
        <MapView
          reports={visible}
          flagged={new Set()}
          affectedOnly={filters.affectedOnly}
          hazards={hazards}
          bbox={app.profile?.bbox}
          padding={padding}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Soft vignette so the floating glass reads against busy map areas. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,4,10,.55))]" />

      <ControlPane
        ref={pane}
        app={{ ...app, reset }}
        visible={visible}
        filters={filters}
        setFilters={setFilters}
        hazards={hazards}
        setHazards={setHazards}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {app.step === "explorer" && (
        <ChatWidget
          ref={chat}
          open={chatOpen}
          setOpen={setChatOpen}
          reports={visible}
          profile={app.profile}
          launcherBottom={padding.bottom ? padding.bottom - 8 : 16}
          onCite={(id) => {
            setSelectedId(id);
            // On a phone the chat covers the map; get out of the way.
            if (window.innerWidth < 768) setChatOpen(false);
          }}
        />
      )}
    </main>
  );
}
