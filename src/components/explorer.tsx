"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, TriangleAlert } from "lucide-react";
import type { Profile } from "@/lib/ai/schema";
import { findContradictions } from "@/lib/pipeline/contradictions";
import {
  affectedPlaces,
  applyFilters,
  communitiesIn,
  countByUrgency,
  EMPTY_FILTERS,
  unmappedReports,
  type Report,
} from "@/lib/pipeline/reports";
import { AnalystChat } from "./analyst-chat";
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

type Tab = "reports" | "brief" | "evacuation" | "ask" | "unmapped";

export function Explorer({
  reports,
  hasTime,
  profile,
  fallback,
  progress,
}: {
  reports: Report[];
  hasTime: boolean;
  profile: Profile | null;
  fallback?: boolean;
  progress?: { done: number; total: number } | null;
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tab, setTab] = useState<Tab>("reports");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [hazards, setHazards] = useState(true);

  const visible = useMemo(() => applyFilters(reports, filters), [reports, filters]);
  const notFlagged = useMemo(
    () => visible.filter((r) => !flagged.has(r.report_id)),
    [visible, flagged],
  );
  const counts = useMemo(() => countByUrgency(notFlagged), [notFlagged]);
  const communities = useMemo(() => communitiesIn(reports), [reports]);
  const origins = useMemo(() => affectedPlaces(reports), [reports]);
  const unmapped = useMemo(() => unmappedReports(visible), [visible]);
  const plottedCount = useMemo(
    () =>
      visible.filter(
        (r) => r.place && (!filters.affectedOnly || r.result.places[0]?.role === "affected"),
      ).length,
    [visible, filters.affectedOnly],
  );
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const contradictions = useMemo(() => findContradictions(reports), [reports]);
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
    { key: "ask", label: "Ask" },
  ];

  return (
    /* The row must not grow with its content: an uncapped flex row let the
       report list stretch the map container to thousands of pixels tall, which
       made Leaflet render hundreds of tiles and mis-frame every fitBounds. */
    <div className="flex flex-1 flex-col gap-4 px-6 py-4 lg:flex-row">
      <section className="flex flex-col gap-2 lg:w-3/5">
        {fallback ? (
          <p className="rounded-sm border border-warning bg-warning/10 px-3 py-1.5 text-sm">
            Quick sort — AI unavailable, using keyword matching
          </p>
        ) : null}
        {progress && progress.done < progress.total ? (
          <p className="tabular flex items-center gap-2 rounded-sm bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Reading tweets… {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={filters.affectedOnly}
            onClick={() => setFilters({ ...filters, affectedOnly: !filters.affectedOnly })}
            className={`rounded-sm border px-2 py-1 text-xs font-medium transition-colors ${
              filters.affectedOnly
                ? "border-secondary bg-secondary text-secondary-foreground"
                : "border-border bg-surface hover:bg-muted"
            }`}
          >
            {filters.affectedOnly ? "Affected areas only" : "All mentioned places"}
          </button>
          <button
            type="button"
            aria-pressed={hazards}
            onClick={() => setHazards(!hazards)}
            className={`inline-flex items-center gap-2 rounded-sm border px-2 py-1 text-xs font-medium transition-colors ${
              hazards
                ? "border-secondary bg-secondary text-secondary-foreground"
                : "border-border bg-surface hover:bg-muted"
            }`}
          >
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
            Infrastructure hazards
          </button>
          <span className="text-xs text-muted-foreground">
            {filters.affectedOnly
              ? "Places the reports say are being hit"
              : "Dashed = aid coming from there · faded = mentioned only"}
          </span>
        </div>

        <div className="h-[560px] overflow-hidden rounded-md border border-border">
          <MapView
            reports={visible}
            flagged={flagged}
            affectedOnly={filters.affectedOnly}
            bbox={profile?.bbox}
            hazards={hazards}
            onSelect={setSelectedId}
          />
        </div>

        <p className="tabular text-xs text-muted-foreground">
          {plottedCount} of {visible.length} reports plotted · {counts.critical} critical ·{" "}
          {counts.urgent} urgent
          {!hasTime
            ? " · no timestamps in this file, so the map shows where reports concentrate, not how they spread"
            : ""}
        </p>
      </section>

      <section className="flex h-[620px] flex-col overflow-hidden rounded-md border border-border bg-surface lg:w-2/5">
        <div className="flex border-b border-border" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-2 py-2.5 text-sm font-medium transition-colors ${
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
            contradiction={contradictions.get(selected.report_id)}
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
              unmappedCount={unmapped.length}
              onShowUnmapped={() => setTab("unmapped")}
              contradictionCount={contradictions.size}
            />
            <ul className="lfm-stagger flex-1 space-y-2 overflow-y-auto p-3">
              {visible.length === 0 ? (
                <li className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
                  No reports match these filters. Clear the search or widen the urgency.
                </li>
              ) : null}
              {visible.map((report) => {
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
                      <p className="mt-2 text-sm">{report.clean_text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-medium">{report.result.cat}</span>
                        {contradictions.has(report.report_id) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning-text">
                            <TriangleAlert className="h-3 w-3" aria-hidden />
                            Conflicting reports
                          </span>
                        ) : null}
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
        ) : tab === "unmapped" ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Reports with no location</p>
              <p className="tabular mt-1 text-xs text-muted-foreground">
                {unmapped.length} related reports name no place we could put on the map. They are
                still in the dataset and the export.
              </p>
            </div>
            <ul className="lfm-stagger flex-1 space-y-2 overflow-y-auto p-3">
              {unmapped.map((r) => (
                <li key={r.report_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.report_id)}
                    className="w-full rounded-md border border-border p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <UrgencyBadge urgency={r.result.urg} />
                      <span className="tabular text-xs text-muted-foreground">{r.report_id}</span>
                    </div>
                    <p className="mt-2 text-sm">{r.clean_text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.result.places[0]
                        ? `Named "${r.result.places[0].name}" — no coordinates found`
                        : "No place named"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : tab === "ask" ? (
          <AnalystChat
            reports={notFlagged}
            profile={profile}
            cacheKey={filterKey}
            onCite={(id) => setSelectedId(id)}
          />
        ) : tab === "brief" ? (
          <SituationBrief reports={notFlagged} filterKey={filterKey} profile={profile} />
        ) : (
          <EvacuationRoutes origins={origins} profile={profile} />
        )}
      </section>
    </div>
  );
}
