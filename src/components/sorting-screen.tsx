"use client";

import { Check, Loader2 } from "lucide-react";

export type SortStage = "Reading tweets" | "Finding places" | "Placing on map" | "Done";

const STAGES: SortStage[] = ["Reading tweets", "Finding places", "Placing on map"];

type Props = {
  stage: SortStage;
  done: number;
  total: number;
  found: number;
};

/** Measured aggregate throughput against the organizers' endpoint. */
const TWEETS_PER_SECOND = 6;

function remainingLabel(done: number, total: number): string | null {
  const left = total - done;
  if (left <= 0) return null;
  const seconds = Math.round(left / TWEETS_PER_SECOND);
  if (seconds < 45) return "under a minute left";
  return `about ${Math.max(1, Math.round(seconds / 60))} min left`;
}

export function SortingScreen({ stage, done, total, found }: Props) {
  const currentIndex = STAGES.indexOf(stage);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const eta = remainingLabel(done, total);

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-6 py-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-secondary">Sorting the file</h1>
        <p className="mt-2 text-muted-foreground">
          Reports appear on the map as each batch finishes. Nothing waits for approval.
        </p>
      </div>

      <ol className="space-y-3">
        {STAGES.map((s, i) => {
          const complete = stage === "Done" || i < currentIndex;
          const active = s === stage;
          return (
            <li key={s} className="flex items-center gap-3">
              {complete ? (
                <Check className="h-4 w-4 text-success-text" aria-hidden />
              ) : active ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              ) : (
                <span className="h-4 w-4 rounded-sm border border-border" aria-hidden />
              )}
              <span
                className={
                  complete || active ? "font-medium" : "text-muted-foreground"
                }
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-sm bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="tabular text-sm text-muted-foreground">
          {done.toLocaleString()} of {total.toLocaleString()} posts read · {found.toLocaleString()}{" "}
          reports found{eta ? ` · ${eta}` : ""}
        </p>
        {total > 1000 ? (
          <p className="text-xs text-muted-foreground">
            Large file. The first reports appear on the map within about twenty seconds — you can
            start reading them while the rest finish.
          </p>
        ) : null}
      </div>
    </div>
  );
}
