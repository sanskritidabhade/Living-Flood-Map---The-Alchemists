"use client";

import { Flag, Megaphone, X } from "lucide-react";
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function ReportCard({
  report,
  flagged,
  onFlag,
  onClose,
}: {
  report: Report;
  flagged: boolean;
  onFlag: (id: string) => void;
  onClose: () => void;
}) {
  const r = report.result;
  const evidence = r.places[0]?.text;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={r.urg} />
          <span className="tabular text-xs text-muted-foreground">{report.report_id}</span>
          {flagged ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold">
              <Flag className="h-3 w-3" aria-hidden />
              Flagged
            </span>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close report">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <blockquote className="rounded-md border border-border bg-background p-3 text-sm leading-relaxed">
          {splitOnEvidence(report.clean_text, evidence).map((part, i) =>
            part.match ? (
              <mark key={i} className="rounded-sm bg-primary/20 px-0.5 font-semibold text-foreground">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </blockquote>

        {report.echo_count > 1 ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Megaphone className="h-3 w-3" aria-hidden />
            Echoed by {report.echo_count} accounts
          </p>
        ) : null}

        <dl className="mt-4 divide-y divide-border">
          <Field label="Category" value={r.cat} />
          <Field label="Urgency" value={<UrgencyBadge urgency={r.urg} />} />
          <Field
            label="Relevance"
            value={
              <span className="flex items-center gap-2">
                Related
                <ConfidenceBadge confidence={r.conf} />
                {r.why ? <span className="text-xs text-muted-foreground">· {r.why}</span> : null}
              </span>
            }
          />
          <Field label="Eyewitness" value={r.eye ? "Yes, firsthand" : "No, secondhand"} />
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
            />
          ) : null}
          {r.who ? <Field label="Who is affected" value={r.who} /> : null}
          {r.needs.length ? <Field label="Needs" value={r.needs.join(", ")} /> : null}
          <Field label="Source type" value={r.src} />
          {r.fn ? <Field label="Community" value={r.fn} /> : null}
          {r.time ? <Field label="When" value={`${r.time.text} (${r.time.type})`} /> : null}
          <Field
            label="Confidence"
            value={`${CONFIDENCE_WORD[r.conf]} — ${report.place?.precision ?? "no location"}`}
          />
        </dl>

        {report.verification ? (
          <div className="mt-4 rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Claim about official status
            </p>
            <p className="mt-1.5 text-sm font-medium">
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
