"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatWidget } from "@/components/chat-widget";
import { ControlPane } from "@/components/control-pane";
import { chime, select, tick, toggle } from "@/lib/feedback";
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

  // One listener gives every button a click sound; toggles rise or fall with their state.
  useEffect(() => {
    const onPress = (e: PointerEvent) => {
      const el = (e.target as Element).closest<HTMLElement>("button, [role=button]");
      if (!el || el.hasAttribute("disabled") || el.closest("[data-silent]")) return;
      const pressed = el.getAttribute("aria-pressed");
      // pointerdown fires before the click changes anything, so this is the old state.
      if (pressed !== null) toggle(pressed !== "true");
      else tick();
    };
    document.addEventListener("pointerdown", onPress);
    return () => document.removeEventListener("pointerdown", onPress);
  }, []);

  const done = app.progress.stage === "Done" && app.step === "explorer";
  useEffect(() => {
    if (done) chime();
  }, [done]);

  const choose = (id: string | null) => {
    if (id) select();
    setSelectedId(id);
  };

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
          onSelect={choose}
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
        onSelect={choose}
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
            choose(id);
            // On a phone the chat covers the map; get out of the way.
            if (window.innerWidth < 768) setChatOpen(false);
          }}
        />
      )}
    </main>
  );
}
