"use client";

import { useState } from "react";
import { Siren } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Brief, Profile } from "@/lib/ai/schema";
import type { Report } from "@/lib/pipeline/reports";

type Cached = { brief: Brief; at: string };

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="mt-1.5 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-muted-foreground">·</span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 p-4" aria-live="polite">
      <p className="text-sm text-muted-foreground">Analysing reports…</p>
      {[90, 75, 82, 60].map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded-sm bg-muted" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export function SituationBrief({
  reports,
  filterKey,
  profile,
}: {
  reports: Report[];
  filterKey: string;
  profile: Profile | null;
}) {
  const [cache, setCache] = useState<Record<string, Cached>>({});
  const [loading, setLoading] = useState(false);
  const current = cache[filterKey];

  async function generate() {
    setLoading(true);
    try {
      // Top 200 reports in the current filter — one call, cached per filter.
      const top = reports.slice(0, 200).map((r) => ({
        id: r.report_id,
        text: r.clean_text,
        cat: r.result.cat,
        urg: r.result.urg,
        place: r.result.places[0]?.name,
        fn: r.result.fn,
      }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "brief", input: { reports: top }, profile }),
      });
      if (!res.ok) throw new Error("brief failed");
      const body = await res.json();
      setCache((c) => ({
        ...c,
        [filterKey]: { brief: body.data as Brief, at: new Date().toLocaleString("en-CA") },
      }));
    } catch {
      toast.error("The brief could not be generated. The reports are still on the map.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Skeleton />;

  if (!current) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Summarise the {Math.min(reports.length, 200).toLocaleString()} reports matching your
          current filters.
        </p>
        <Button onClick={generate} disabled={reports.length === 0}>
          Generate situation brief
        </Button>
      </div>
    );
  }

  const b = current.brief;
  return (
    <div className="overflow-y-auto p-4">
      <div className="flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2">
        <Siren className="h-4 w-4 text-danger-text" aria-hidden />
        <span className="tabular text-sm font-semibold text-danger-text">
          {b.critical_count} critical
        </span>
      </div>

      <p className="mt-3 text-sm font-medium">{b.headline}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.summary}</p>

      <List title="Worst areas" items={b.worst_areas} />
      <List title="Roads and bridges" items={b.roads_and_bridges} />
      <List title="Evacuations" items={b.evacuations} />
      <List title="Needs" items={b.needs} />
      <List title="First Nations affected" items={b.first_nations_affected} />

      <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">
        AI-generated · {current.at} · not verified
      </p>
      <Button variant="ghost" size="sm" className="mt-2" onClick={generate}>
        Regenerate
      </Button>
    </div>
  );
}
