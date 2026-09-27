"use client";

import { forwardRef, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileUp,
  Loader2,
  MapPin,
  Radar,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Profile } from "@/lib/ai/schema";
import { parseCsv, type IngestResult } from "@/lib/pipeline/ingest";
import { countByUrgency, splitOnEvidence, type Filters, type Report } from "@/lib/pipeline/reports";
import type { useFloodMap } from "@/lib/use-flood-map";

type App = ReturnType<typeof useFloodMap>;

const URGENCIES = [
  { key: "critical", label: "Critical", color: "#DC2626" },
  { key: "urgent", label: "Urgent", color: "#F59E0B" },
  { key: "information", label: "Info", color: "#3B82F6" },
] as const;
const URG_COLOR = { critical: "#DC2626", urgent: "#F59E0B", information: "#3B82F6" } as const;
const URG_RANK = { critical: 0, urgent: 1, information: 2 } as const;
const CONF_LABEL = { h: "High", m: "Medium", l: "Low" } as const;
const PAGE = 120;

type Props = {
  app: App;
  visible: Report[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  hazards: boolean;
  setHazards: (v: boolean) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/**
 * The floating neon card. Desktop: a tall panel on the left. Phone: a bottom
 * sheet that collapses to its header so the map stays usable.
 */
export const ControlPane = forwardRef<HTMLElement, Props>(function ControlPane(props, ref) {
  const [expanded, setExpanded] = useState(true);
  const { app } = props;

  return (
    <aside
      ref={ref}
      className={`neon-card fixed inset-x-2 bottom-2 z-20 flex flex-col overflow-hidden transition-[max-height] duration-300
        md:inset-x-auto md:bottom-4 md:left-4 md:top-4 md:w-[min(400px,calc(100vw-2rem))] md:max-h-none
        ${expanded ? "max-h-[62dvh]" : "max-h-[76px]"}`}
    >
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_14px_rgba(34,211,238,.45)]">
          <Radar className="h-5 w-5 text-cyan-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="neon-text text-[15px] font-bold uppercase leading-none tracking-[0.18em]">
            Living Flood Map
          </p>
          <p className="mt-1 truncate text-xs text-cyan-100/55">
            {app.profile ? `${app.profile.event_name} · ${app.profile.region}` : "Disaster posts → live map"}
          </p>
        </div>
        {app.step !== "start" && (
          <IconButton label="Start over" onClick={app.reset}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        )}
        <IconButton
          label={expanded ? "Collapse panel" : "Expand panel"}
          onClick={() => setExpanded((e) => !e)}
          className="md:hidden"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </IconButton>
      </header>

      <div className="hud-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {app.step === "start" && <StartPanel app={app} />}
        {app.step === "sorting" && <ReadingPanel />}
        {app.step === "brief" && app.profile && <BriefPanel app={app} profile={app.profile} />}
        {app.step === "explorer" && <ExplorerPanel {...props} />}
      </div>
    </aside>
  );
});

function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-400/20 text-cyan-100/70 transition hover:border-cyan-400/60 hover:text-cyan-200 hover:shadow-[0_0_12px_rgba(34,211,238,.35)] ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------- Start ---------------- */

function StartPanel({ app }: { app: App }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function take(file?: File) {
    if (!file) return;
    const parsed: IngestResult = parseCsv(await file.text());
    app.readFile(parsed);
  }

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-3xl font-bold uppercase leading-[1.05] tracking-wide">
          See the flood
          <br />
          <span className="neon-text">as it happens.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-cyan-50/65">
          Drop in a CSV of posts from a disaster. AI sorts them by urgency, finds the places, and
          pins them on the map for a person to review.
        </p>
      </div>

      <button
        type="button"
        onClick={app.loadSample}
        className="neon-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em]"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        Try the Alberta 2013 sample
      </button>

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void take(e.dataTransfer.files[0]);
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition ${
          dragging
            ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,.35)]"
            : "border-cyan-400/35 hover:border-cyan-300/70 hover:bg-cyan-400/5"
        }`}
      >
        <FileUp className="h-6 w-6 text-cyan-300" aria-hidden />
        <span className="text-sm font-semibold">Drop a CSV or click to upload</span>
        <span className="text-xs text-cyan-50/50">One post per row. Text column is detected.</span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => void take(e.target.files?.[0])}
      />
    </div>
  );
}

function ReadingPanel() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-300" aria-hidden />
      <p className="font-semibold uppercase tracking-[0.14em]">Reading the event</p>
      <p className="text-sm text-cyan-50/55">Sampling posts to work out what happened and where.</p>
    </div>
  );
}

/* ---------------- Brief ---------------- */

function BriefPanel({ app, profile }: { app: App; profile: Profile }) {
  return (
    <div className="space-y-5 pt-1">
      <div>
        <Label>Is this the event?</Label>
        <h2 className="mt-1 text-2xl font-bold leading-tight">{profile.event_name}</h2>
        <p className="mt-1 text-sm text-cyan-50/60">
          {profile.event_type} · {profile.region}, {profile.country} ·{" "}
          {app.rows.length.toLocaleString()} posts
        </p>
      </div>
      <p className="text-sm leading-relaxed text-cyan-50/75">{profile.what_counts_as_related}</p>
      <Chips label="Key places" items={profile.key_places} />
      <Chips label="Hashtags" items={profile.key_hashtags} />
      <button
        type="button"
        onClick={() => app.sortTweets(profile)}
        className="neon-button w-full rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em]"
      >
        Confirm and map it
      </button>
    </div>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((t) => (
          <span key={t} className="rounded-md border border-cyan-400/25 bg-cyan-400/5 px-2 py-0.5 text-xs">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">{children}</p>
  );
}

/* ---------------- Explorer ---------------- */

function ExplorerPanel({
  app,
  visible,
  filters,
  setFilters,
  hazards,
  setHazards,
  selectedId,
  onSelect,
}: Props) {
  const [limit, setLimit] = useState(PAGE);
  const counts = useMemo(() => countByUrgency(visible), [visible]);
  const sorted = useMemo(
    () => [...visible].sort((a, b) => URG_RANK[a.result.urg] - URG_RANK[b.result.urg]),
    [visible],
  );
  const selected = selectedId ? app.reports.find((r) => r.report_id === selectedId) : undefined;
  const { stage, done, total, found } = app.progress;
  const sorting = stage !== "Done";

  const toggleUrgency = (key: string) =>
    setFilters({
      ...filters,
      urgency: filters.urgency.includes(key)
        ? filters.urgency.filter((u) => u !== key)
        : [...filters.urgency, key],
    });

  return (
    <div className="space-y-4">
      {sorting && (
        <div>
          <div className="flex justify-between text-xs text-cyan-50/60">
            <span className="uppercase tracking-[0.14em]">{stage}</span>
            <span className="tabular">
              {done.toLocaleString()}/{total.toLocaleString()} · {found.toLocaleString()} relevant
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cyan-400/10">
            <div
              className="h-full rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,.9)] transition-[width] duration-500"
              style={{ width: `${total ? Math.min(100, (done / total) * 100) : 5}%` }}
            />
          </div>
        </div>
      )}

      {app.fallback && (
        <p className="flex gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2.5 text-xs text-amber-100">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          AI was unavailable, so a keyword pass sorted these. Treat them as low confidence.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {URGENCIES.map((u) => {
          const on = filters.urgency.includes(u.key);
          return (
            <button
              key={u.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggleUrgency(u.key)}
              className="rounded-xl border bg-black/20 px-3 py-2.5 text-left transition"
              style={{
                borderColor: on ? u.color : "rgba(34,211,238,.18)",
                boxShadow: on ? `0 0 16px ${u.color}66` : undefined,
              }}
            >
              <span className="tabular block text-2xl font-bold leading-none" style={{ color: u.color }}>
                {counts[u.key].toLocaleString()}
              </span>
              <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-cyan-50/60">
                {u.label}
              </span>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-black/25 px-3 focus-within:border-cyan-300/70 focus-within:shadow-[0_0_14px_rgba(34,211,238,.3)]">
        <Search className="h-4 w-4 text-cyan-300/70" aria-hidden />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search posts or places"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-cyan-50/35"
        />
      </label>

      <div className="flex flex-wrap gap-1.5">
        <Toggle on={filters.affectedOnly} onClick={() => setFilters({ ...filters, affectedOnly: !filters.affectedOnly })}>
          <MapPin className="h-3.5 w-3.5" /> Affected only
        </Toggle>
        <Toggle on={hazards} onClick={() => setHazards(!hazards)}>
          <TriangleAlert className="h-3.5 w-3.5" /> Hazards
        </Toggle>
        <Toggle
          on={filters.eyewitnessOnly}
          onClick={() => setFilters({ ...filters, eyewitnessOnly: !filters.eyewitnessOnly })}
        >
          <Eye className="h-3.5 w-3.5" /> Eyewitness
        </Toggle>
      </div>

      {selected && <SelectedReport report={selected} onClose={() => onSelect(null)} />}

      <div>
        <Label>{visible.length.toLocaleString()} reports</Label>
        <ul className="mt-2 space-y-1.5">
          {sorted.slice(0, limit).map((r) => (
            <li key={r.report_id}>
              <button
                type="button"
                onClick={() => onSelect(r.report_id)}
                className={`group flex w-full gap-3 rounded-xl border p-2.5 text-left transition ${
                  r.report_id === selectedId
                    ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_14px_rgba(34,211,238,.3)]"
                    : "border-transparent hover:border-cyan-400/25 hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className="mt-0.5 w-1 shrink-0 self-stretch rounded-full"
                  style={{ background: URG_COLOR[r.result.urg], boxShadow: `0 0 8px ${URG_COLOR[r.result.urg]}` }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold uppercase tracking-wider text-cyan-100/80">
                    {r.result.places[0]?.name ?? "No place"} · {r.result.cat}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-sm text-cyan-50/75">{r.clean_text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {sorted.length > limit && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="mt-2 w-full rounded-lg border border-cyan-400/25 py-2 text-xs uppercase tracking-[0.14em] text-cyan-200 hover:border-cyan-300/60"
          >
            Show more ({(sorted.length - limit).toLocaleString()} left)
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        on
          ? "border-cyan-300/80 bg-cyan-400/15 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,.35)]"
          : "border-cyan-400/20 text-cyan-50/55 hover:border-cyan-400/45"
      }`}
    >
      {children}
    </button>
  );
}

function SelectedReport({ report: r, onClose }: { report: Report; onClose: () => void }) {
  const parts = splitOnEvidence(r.clean_text, r.result.places[0]?.text);
  const v = r.verification;
  return (
    <div
      className="relative rounded-xl border bg-black/30 p-3.5"
      style={{ borderColor: URG_COLOR[r.result.urg], boxShadow: `0 0 18px ${URG_COLOR[r.result.urg]}40` }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close report"
        className="absolute right-2 top-2 rounded-md p-1 text-cyan-50/50 hover:text-cyan-100"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pr-6 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: URG_COLOR[r.result.urg] }}>
        {r.result.urg} · {r.result.cat}
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        {parts.map((p, i) =>
          p.match ? (
            <mark key={i} className="rounded bg-cyan-400/25 px-0.5 text-cyan-100">
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Meta k="Place" v={r.result.places[0]?.name ?? "—"} />
        <Meta k="Confidence" v={CONF_LABEL[r.result.conf]} />
        <Meta k="Source" v={r.result.src} />
        <Meta k="Eyewitness" v={r.result.eye ? "Yes" : "No"} />
        {r.result.fn && <Meta k="Community" v={r.result.fn} />}
        {v && <Meta k="Verification" v={v.verification_status.replace("_", " ")} />}
      </dl>
      {r.result.needs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.result.needs.map((n) => (
            <span key={n} className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-100">
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-cyan-300/60">{k}</dt>
      <dd className="truncate capitalize">{v}</dd>
    </div>
  );
}
