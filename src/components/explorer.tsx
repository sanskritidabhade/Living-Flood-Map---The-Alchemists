"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { Profile } from "@/lib/ai/schema";
import {
  affectedPlaces,
  applyFilters,
  communitiesIn,
  countByUrgency,
  EMPTY_FILTERS,
  splitOnEvidence,
  type Report,
} from "@/lib/pipeline/reports";
import { EvacuationRoutes } from "./evacuation-routes";
import { FilterBar } from "./filter-bar";
import { ReportCard } from "./report-card";
import { SituationBrief } from "./situation-brief";
import { ConfidenceBadge, UrgencyBadge, VerificationBadge } from "./urgency-badge";

/** Leaflet touches window on import, so it can never be server-rendered. */
const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-md border border-border bg-muted">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
    </div>
  ),
});

type Tab = "reports" | "brief" | "evacuation";

export function Explorer({
  reports,
  hasTime,
  profile,
  progress,
}: {
  reports: Report[];
  hasTime: boolean;
  profile: Profile | null;
  progress?: { done: number; total: number } | null;
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tab, setTab] = useState<Tab>("reports");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  const visible = useMemo(() => applyFilters(reports, filters), [reports, filters]);
  const notFlagged = useMemo(
    () => visible.filter((r) => !flagged.has(r.report_id)),
    [visible, flagged],
  );
  const counts = useMemo(() => countByUrgency(notFlagged), [notFlagged]);
  const communities = useMemo(() => communitiesIn(reports), [reports]);
  const origins = useMemo(() => affectedPlaces(reports), [reports]);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const selected = visible.find((r) => r.report_id === selectedId) ?? null;

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "reports", label: "Reports" },
    { key: "brief", label: "Situation brief" },
    { key: "evacuation", label: "Evacuation routes" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-4 lg:flex-row">
      <section className="flex min-h-[380px] flex-col gap-2 lg:w-3/5">
        {progress && progress.done < progress.total ? (
          <p className="tabular flex items-center gap-2 rounded-sm bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Reading tweets… {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
          </p>
        ) : null}

        <div className="min-h-[340px] flex-1 overflow-hidden rounded-md border border-border">
          <MapView reports={visible} flagged={flagged} onSelect={setSelectedId} />
        </div>

        <p className="tabular text-xs text-muted-foreground">
          {visible.filter((r) => r.place).length} of {visible.length} reports plotted ·{" "}
          {counts.critical} critical · {counts.urgent} urgent
          {!hasTime
            ? " · no timestamps in this file, so the map shows where reports concentrate, not how they spread"
            : ""}
        </p>
      </section>

      <section className="flex min-h-[380px] flex-col overflow-hidden rounded-md border border-border bg-surface lg:w-2/5">
        <div className="flex border-b border-border" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {selected ? (
          <ReportCard
            report={selected}
            flagged={flagged.has(selected.report_id)}
            onFlag={toggleFlag}
            onClose={() => setSelectedId(null)}
          />
        ) : tab === "reports" ? (
          <>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              communities={communities}
              shown={visible.length}
              total={reports.filter((r) => r.result.rel).length}
            />
            <ul className="flex-1 space-y-2 overflow-y-auto p-3">
              {visible.length === 0 ? (
                <li className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
                  No reports match these filters. Clear the search or widen the urgency.
                </li>
              ) : null}
              {visible.map((report) => {
                const evidence = report.result.places[0]?.text;
                return (
                  <li key={report.report_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(report.report_id)}
                      className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-muted ${
                        flagged.has(report.report_id)
                          ? "border-border opacity-55"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <UrgencyBadge urgency={report.result.urg} />
                        <span className="tabular text-xs text-muted-foreground">
                          {report.report_id}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">
                        {splitOnEvidence(report.clean_text, evidence).map((part, i) =>
                          part.match ? (
                            <mark
                              key={i}
                              className="rounded-sm bg-primary/20 px-0.5 font-semibold text-foreground"
                            >
                              {part.text}
                            </mark>
                          ) : (
                            <span key={i}>{part.text}</span>
                          ),
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-medium">{report.result.cat}</span>
                        <ConfidenceBadge confidence={report.result.conf} />
                        {report.verification ? (
                          <VerificationBadge verification={report.verification} />
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : tab === "brief" ? (
          <SituationBrief reports={notFlagged} filterKey={filterKey} profile={profile} />
        ) : (
          <EvacuationRoutes origins={origins} profile={profile} />
        )}
      </section>
    </div>
  );
}
