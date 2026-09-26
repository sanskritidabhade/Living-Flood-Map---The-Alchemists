"use client";

import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/ai/schema";
import {
  applyFilters,
  countByUrgency,
  splitOnEvidence,
  EMPTY_FILTERS,
  type Report,
} from "@/lib/pipeline/reports";
import { ConfidenceBadge, UrgencyBadge, VerificationBadge } from "./urgency-badge";

export function Explorer({ reports, hasTime }: { reports: Report[]; hasTime: boolean }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);

  const visible = useMemo(() => applyFilters(reports, filters), [reports, filters]);
  const counts = useMemo(() => countByUrgency(visible), [visible]);
  const mapped = visible.filter((r) => r.place);
  const selectedReport = visible.find((r) => r.report_id === selected);

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-6 lg:flex-row">
      {/* Map placeholder — Leaflet lands in slice 2. */}
      <section className="flex min-h-[320px] flex-col rounded-md border border-border bg-muted lg:w-3/5">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="font-semibold">Map arrives in the next build</p>
          <p className="tabular max-w-[40ch] text-sm text-muted-foreground">
            {mapped.length} of {visible.length} reports have a location we can plot.
          </p>
        </div>
        {!hasTime ? (
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            This file has no timestamps, so the map shows where reports concentrate, not how they
            spread over time.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 lg:w-2/5">
        <div className="space-y-3 rounded-md border border-border bg-surface p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-8"
              placeholder="Search reports"
              aria-label="Search reports"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.urgency}
              onValueChange={(urgency) => setFilters({ ...filters, urgency })}
            >
              <SelectTrigger className="w-[150px]" aria-label="Filter by urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All urgency</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="information">Information</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(category) => setFilters({ ...filters, category })}
            >
              <SelectTrigger className="w-[200px]" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="tabular text-sm text-muted-foreground">
            {visible.length} reports · {counts.critical} critical · {counts.urgent} urgent
          </p>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto">
          {visible.length === 0 ? (
            <li className="rounded-md border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              No reports match these filters. Clear the search or widen the urgency.
            </li>
          ) : null}

          {visible.map((report) => {
            const evidence = report.result.places[0]?.text;
            const isOpen = report.report_id === selectedReport?.report_id;
            return (
              <li key={report.report_id}>
                <button
                  type="button"
                  onClick={() => setSelected(isOpen ? null : report.report_id)}
                  className="w-full rounded-md border border-border bg-surface p-3 text-left hover:bg-muted"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center justify-between gap-2">
                    <UrgencyBadge urgency={report.result.urg} />
                    <span className="text-xs text-muted-foreground">{report.report_id}</span>
                  </div>

                  <p className="mt-2 text-sm">
                    {splitOnEvidence(report.clean_text, evidence).map((part, i) =>
                      part.match ? (
                        <mark key={i} className="bg-primary/20 font-semibold text-foreground">
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

                  {isOpen ? (
                    <dl className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                      {report.result.places[0] ? (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Place</dt>
                          <dd>
                            {report.result.places[0].name} ({report.result.places[0].role})
                            {report.place
                              ? ` · ${report.place.lat.toFixed(3)}, ${report.place.lng.toFixed(3)}`
                              : " · not plotted"}
                          </dd>
                        </div>
                      ) : null}
                      {report.result.who ? (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Who</dt>
                          <dd>{report.result.who}</dd>
                        </div>
                      ) : null}
                      {report.result.needs.length ? (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Needs</dt>
                          <dd>{report.result.needs.join(", ")}</dd>
                        </div>
                      ) : null}
                      {report.result.fn ? (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Community</dt>
                          <dd>{report.result.fn}</dd>
                        </div>
                      ) : null}
                      {report.verification?.note ? (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground">Check</dt>
                          <dd>
                            {report.verification.note} ({report.verification.expected_source})
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
