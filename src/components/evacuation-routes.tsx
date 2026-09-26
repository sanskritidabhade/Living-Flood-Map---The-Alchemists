"use client";

import { useState } from "react";
import { ArrowRight, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile, Route } from "@/lib/ai/schema";
import { evacuationPlanHtml } from "@/lib/pipeline/evacuation-plan";
import { download } from "@/lib/pipeline/export";

function Skeleton() {
  return (
    <div className="space-y-3 p-4" aria-live="polite">
      <p className="text-sm text-muted-foreground">Finding a route out…</p>
      {[70, 85, 55].map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded-sm bg-muted" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export function EvacuationRoutes({
  origins,
  profile,
}: {
  origins: string[];
  profile: Profile | null;
}) {
  const [from, setFrom] = useState("");
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);

  async function findRoute(origin: string) {
    setFrom(origin);
    setLoading(true);
    setRoute(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "evacuation", input: { origins: [origin] }, profile }),
      });
      if (!res.ok) throw new Error("evacuation failed");
      const body = await res.json();
      const routes = (body.data.routes ?? []) as Route[];
      // The mock returns the whole seeded set; pick the one asked for.
      setRoute(routes.find((r) => r.from === origin) ?? routes[0] ?? null);
    } catch {
      toast.error("No route could be worked out for that place.");
    } finally {
      setLoading(false);
    }
  }

  function exportPlan() {
    if (!route) return;
    const html = evacuationPlanHtml(route, profile?.event_name ?? "current event");
    download(
      `evacuation-plan-${route.from.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`,
      html,
      "text/html;charset=utf-8",
    );
    toast.success(`Evacuation plan for ${route.from} exported`);
  }

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="evac-from">
          Leaving from
        </label>
        <Select value={from} onValueChange={findRoute}>
          <SelectTrigger id="evac-from" className="w-full">
            <SelectValue placeholder="Choose an affected place or community" />
          </SelectTrigger>
          <SelectContent>
            {origins.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Places the reports say are being hit. Destinations are outside the affected area.
        </p>
      </div>

      {loading ? <Skeleton /> : null}

      {route && !loading ? (
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
            {route.from}
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            {route.to}
          </p>
          <p className="text-xs text-muted-foreground">{route.to_kind}</p>

          <dl className="mt-3 divide-y divide-border text-sm">
            <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5">
              <dt className="text-muted-foreground">Check in at</dt>
              <dd className="font-medium">{route.shelter}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5">
              <dt className="text-muted-foreground">Route</dt>
              <dd className="font-medium">{route.via}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5">
              <dt className="text-muted-foreground">Distance</dt>
              <dd className="tabular font-medium">{route.distance_km} km</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5">
              <dt className="text-muted-foreground">Driving time</dt>
              <dd className="font-medium">{route.drive_time}</dd>
            </div>
          </dl>

          {route.note ? (
            <p className="mt-3 border-l-2 border-warning pl-3 text-sm text-muted-foreground">
              {route.note}
            </p>
          ) : null}

          <Button className="mt-4 w-full" onClick={exportPlan}>
            <Printer className="h-4 w-4" aria-hidden />
            Export evacuation plan
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            AI-generated · not an official evacuation order.
          </p>
        </div>
      ) : null}
    </div>
  );
}
