"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { parseCsv } from "@/lib/pipeline/ingest";
import { useFloodMap } from "@/lib/use-flood-map";

/** Mapbox GL and Leaflet both touch window on import, so the map is never server-rendered. */
const MapView = dynamic(() => import("@/components/map-view"), { ssr: false });

/** Bare shell: every piece of state and every action is wired, nothing is styled. */
export default function Home() {
  const app = useFloodMap();
  const [selected, setSelected] = useState<string | null>(null);

  if (app.step === "start") {
    return (
      <main>
        <h1>Living Flood Map</h1>
        <button onClick={app.loadSample}>Load sample</button>
        <input
          type="file"
          accept=".csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) app.readFile(parseCsv(await file.text()));
          }}
        />
      </main>
    );
  }

  if (app.step === "brief" && app.profile) {
    return (
      <main>
        <pre>{JSON.stringify(app.profile, null, 2)}</pre>
        <button onClick={() => app.sortTweets(app.profile!)}>Confirm and sort</button>
      </main>
    );
  }

  const { stage, done, total, found } = app.progress;
  const relevant = app.reports.filter((r) => r.result.rel);

  return (
    <main className="flex h-screen flex-col">
      <p>
        {stage} · {done}/{total} read · {found} relevant
        {app.fallback && " · AI unavailable, keyword fallback used"}
      </p>
      {app.step === "explorer" && (
        <div className="flex min-h-0 flex-1">
          <div className="flex-1">
            <MapView
              reports={relevant}
              flagged={new Set()}
              affectedOnly
              hazards
              stillSorting={stage !== "Done"}
              onSelect={setSelected}
            />
          </div>
          <ul className="w-96 overflow-auto">
            {relevant.map((r) => (
              <li key={r.report_id} style={{ fontWeight: r.report_id === selected ? 700 : 400 }}>
                [{r.result.urg}] {r.clean_text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
