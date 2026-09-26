"use client";

import { useState } from "react";
import { Flag, Megaphone, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { splitOnEvidence, type Report } from "@/lib/pipeline/reports";
import { ConfidenceBadge, UrgencyBadge, VerificationBadge } from "./urgency-badge";

const CONFIDENCE_WORD = { h: "High", m: "Medium", l: "Low" } as const;
const CLAIM_LABEL: Record<string, string> = {
  dam_status: "Dam status",
  evacuation_order: "Evacuation order",
  road_closure: "Road closure",
  shelter_capacity: "Shelter capacity",
  river_level: "River level",
  other_official: "Official status",
};

/**
 * DESIGN.md's one bold moment: the messy tweet on the left, the structured
 * draft on the right. Hovering a field lights up the words it came from, so a
 * judge can see the AI is quoting the source, not inventing it.
 */
function Field({
  label,
  value,
  evidence,
  onHover,
}: {
  label: string;
  value: React.ReactNode;
  evidence?: string;
  onHover: (evidence?: string) => void;
}) {
  const linked = Boolean(evidence);
  return (
    <div
      onMouseEnter={() => onHover(evidence)}
      onMouseLeave={() => onHover(undefined)}
      onFocus={() => onHover(evidence)}
      onBlur={() => onHover(undefined)}
      tabIndex={linked ? 0 : undefined}
      className={`grid grid-cols-[8rem_1fr] gap-2 rounded-sm px-1 py-1.5 transition-colors ${
        linked ? "cursor-help hover:bg-muted" : ""
      }`}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function ReportCard({
  report,
  contradiction,
  flagged,
  onFlag,
  onClose,
}: {
  report: Report;
  contradiction?: { reason: string; withIds: string[] };
  flagged: boolean;
  onFlag: (id: string) => void;
  onClose: () => void;
}) {
  const r = report.result;
  const placeEvidence = r.places[0]?.text;
  // Nothing hovered falls back to the place, so the card is never inert.
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  const active = hovered ?? placeEvidence;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={r.urg} />
          <span className="tabular text-xs text-muted-foreground">{report.report_id}</span>
          {flagged ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs font-semibold">
              <Flag className="h-3 w-3" aria-hidden />
              Flagged
            </span>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close report">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {contradiction ? (
        <div className="border-b border-warning bg-warning/10 px-4 py-2">
          <p className="flex items-start gap-2 text-sm font-semibold">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Conflicting reports from this area — verify before acting.
          </p>
          <p className="mt-1 pl-6 text-xs text-muted-foreground">
            {contradiction.reason}. See {contradiction.withIds.slice(0, 3).join(", ")}.
          </p>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-y-auto xl:flex-row">
        {/* Left: what was actually posted. */}
        <div className="border-b border-border p-4 xl:w-1/2 xl:border-b-0 xl:border-r">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Original post</p>
          <blockquote className="rounded-md border border-border bg-background p-3 text-sm leading-relaxed">
            {splitOnEvidence(report.clean_text, active).map((part, i) =>
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
          </blockquote>

          {report.echo_count > 1 ? (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Megaphone className="h-3 w-3" aria-hidden />
              Echoed by {report.echo_count} accounts
            </p>
          ) : null}

          <p className="mt-3 text-xs text-muted-foreground">
            Hover a field to see the words it came from.
          </p>
        </div>

        {/* Right: what the model made of it. */}
        <div className="p-4 xl:w-1/2">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">AI-generated draft</p>
          <dl className="divide-y divide-border">
            <Field
              label="Category"
              value={r.cat}
              evidence={placeEvidence}
              onHover={setHovered}
            />
            <Field label="Urgency" value={<UrgencyBadge urgency={r.urg} />} onHover={setHovered} />
            <Field
              label="Relevance"
              value={
                <span className="flex flex-wrap items-center gap-2">
                  Related
                  <ConfidenceBadge confidence={r.conf} />
                  {r.why ? <span className="text-xs text-muted-foreground">· {r.why}</span> : null}
                </span>
              }
              onHover={setHovered}
            />
            <Field
              label="Eyewitness"
              value={r.eye ? "Yes, firsthand" : "No, secondhand"}
              onHover={setHovered}
            />
            {r.places[0] ? (
              <Field
                label="Place"
                value={
                  <>
                    {r.places[0].name}{" "}
                    <span className="text-muted-foreground">({r.places[0].role})</span>
                    {report.place ? null : (
                      <span className="text-muted-foreground"> · not plotted</span>
                    )}
                  </>
                }
                evidence={r.places[0].text}
                onHover={setHovered}
              />
            ) : null}
            {r.who ? (
              <Field label="Who is affected" value={r.who} evidence={r.who} onHover={setHovered} />
            ) : null}
            {r.needs.length ? (
              <Field
                label="Needs"
                value={r.needs.join(", ")}
                evidence={r.needs[0]}
                onHover={setHovered}
              />
            ) : null}
            <Field label="Source type" value={r.src} onHover={setHovered} />
            {r.fn ? (
              <Field label="Community" value={r.fn} evidence={r.fn} onHover={setHovered} />
            ) : null}
            {r.time ? (
              <Field
                label="When"
                value={`${r.time.text} (${r.time.type})`}
                evidence={r.time.text}
                onHover={setHovered}
              />
            ) : null}
            <Field
              label="Confidence"
              value={`${CONFIDENCE_WORD[r.conf]} — ${report.place?.precision ?? "no location"}`}
              onHover={setHovered}
            />
          </dl>

          {report.verification ? (
            <div className="mt-4 rounded-md border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Claim about official status
              </p>
              <p className="mt-2 text-sm font-medium">
                {CLAIM_LABEL[report.verification.claim_type] ?? report.verification.claim_type}
              </p>
              <div className="mt-2">
                <VerificationBadge verification={report.verification} />
              </div>
              {report.verification.note ? (
                <p className="mt-2 text-sm text-muted-foreground">{report.verification.note}</p>
              ) : null}
              <a
                className="mt-2 inline-block text-sm font-medium text-secondary underline underline-offset-2"
                href={report.verification.expected_source_url}
                target="_blank"
                rel="noreferrer"
              >
                {report.verification.expected_source}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border px-4 py-3">
        <Button
          variant={flagged ? "secondary" : "ghost"}
          onClick={() => onFlag(report.report_id)}
          className="w-full"
        >
          <Flag className="h-4 w-4" aria-hidden />
          {flagged ? "Flagged — undo" : "Flag this report"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Flagging takes effect immediately. Nothing leaves the tool until you publish.
        </p>
      </div>
    </div>
  );
}
