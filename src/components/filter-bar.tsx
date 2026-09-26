"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, URGENCIES } from "@/lib/ai/schema";
import { activeFilterCount, EMPTY_FILTERS, type Filters } from "@/lib/pipeline/reports";

const URGENCY_LABEL = { critical: "Critical", urgent: "Urgent", information: "Information" } as const;

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
        pressed
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border bg-surface hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  filters,
  onChange,
  communities,
  shown,
  total,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  communities: string[];
  shown: number;
  total: number;
}) {
  const active = activeFilterCount(filters);

  function toggleUrgency(u: string) {
    const next = filters.urgency.includes(u)
      ? filters.urgency.filter((x) => x !== u)
      : [...filters.urgency, u];
    onChange({ ...filters, urgency: next });
  }

  return (
    <div className="space-y-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filters
          {active > 0 ? (
            <span className="tabular rounded-sm bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
              {active}
            </span>
          ) : null}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
          disabled={active === 0}
        >
          Clear all
        </Button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-8"
          placeholder="Search text or place"
          aria-label="Search reports"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {URGENCIES.map((u) => (
          <Toggle key={u} pressed={filters.urgency.includes(u)} onClick={() => toggleUrgency(u)}>
            {URGENCY_LABEL[u]}
          </Toggle>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.category}
          onValueChange={(category) => onChange({ ...filters, category })}
        >
          <SelectTrigger className="h-8 w-[190px] text-xs" aria-label="Filter by category">
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

        <Select
          value={filters.community}
          onValueChange={(community) => onChange({ ...filters, community })}
        >
          <SelectTrigger className="h-8 w-[190px] text-xs" aria-label="Filter by community">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All communities</SelectItem>
            {communities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Toggle
          pressed={filters.eyewitnessOnly}
          onClick={() => onChange({ ...filters, eyewitnessOnly: !filters.eyewitnessOnly })}
        >
          Eyewitness only
        </Toggle>
        <Toggle
          pressed={filters.needsVerification}
          onClick={() => onChange({ ...filters, needsVerification: !filters.needsVerification })}
        >
          Claims needing verification
        </Toggle>
        <Toggle
          pressed={filters.hideLowConfidence}
          onClick={() => onChange({ ...filters, hideLowConfidence: !filters.hideLowConfidence })}
        >
          Hide low confidence
        </Toggle>
      </div>

      <p className="tabular text-sm text-muted-foreground">
        Showing {shown.toLocaleString()} of {total.toLocaleString()} reports
      </p>
    </div>
  );
}
