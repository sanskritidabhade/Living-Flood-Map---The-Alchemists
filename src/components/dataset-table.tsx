"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  download,
  toCsv,
  toExcludedCsv,
  toExcludedRows,
  toReportRows,
} from "@/lib/pipeline/export";
import type { Report } from "@/lib/pipeline/reports";

type SortKey = "report_id" | "urgency" | "category" | "place" | "confidence";

const URGENCY_ORDER = { critical: 0, urgent: 1, information: 2 } as const;
const CONFIDENCE_ORDER = { h: 0, m: 1, l: 2 } as const;

export function DatasetTable({ reports, model }: { reports: Report[]; model: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("report_id");
  const [ascending, setAscending] = useState(true);

  const related = useMemo(() => reports.filter((r) => r.result.rel), [reports]);
  const excludedCount = reports.length - related.length;
  const stamp = () => new Date().toISOString().slice(0, 10);

  const sorted = useMemo(() => {
    const copy = [...related];
    copy.sort((a, b) => {
      const by = (r: Report) => {
        switch (sortKey) {
          case "urgency":
            return URGENCY_ORDER[r.result.urg];
          case "category":
            return r.result.cat;
          case "place":
            return r.result.places[0]?.name ?? "";
          case "confidence":
            return CONFIDENCE_ORDER[r.result.conf];
          default:
            return r.report_id;
        }
      };
      const left = by(a);
      const right = by(b);
      if (left === right) return a.report_id.localeCompare(b.report_id);
      return (left < right ? -1 : 1) * (ascending ? 1 : -1);
    });
    return copy;
  }, [related, sortKey, ascending]);

  function sortBy(key: SortKey) {
    if (key === sortKey) setAscending(!ascending);
    else {
      setSortKey(key);
      setAscending(true);
    }
  }

  /** Main export: related reports only. This is the file that goes into MapAki. */
  function exportCsv() {
    const rows = toReportRows(
      related,
      new Map(related.filter((r) => r.place).map((r) => [r.place!.name, r.place!])),
      new Map(related.filter((r) => r.verification).map((r) => [r.report_id, r.verification!])),
      { model },
    );
    download(`living-flood-map-${stamp()}.csv`, toCsv(rows), "text/csv;charset=utf-8");
    toast.success(`Exported ${rows.length} related reports as CSV`);
  }

  /** Audit trail: what was excluded and why. */
  function exportExcluded() {
    const rows = toExcludedRows(reports, model);
    download(
      `living-flood-map-excluded-${stamp()}.csv`,
      toExcludedCsv(rows),
      "text/csv;charset=utf-8",
    );
    toast.success(`Exported ${rows.length} excluded posts for audit`);
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "report_id", label: "Report" },
    { key: "urgency", label: "Urgency" },
    { key: "category", label: "Category" },
    { key: "place", label: "Place" },
    { key: "confidence", label: "Confidence" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-secondary">Dataset</h2>
          <p className="tabular text-sm text-muted-foreground">
            {related.length.toLocaleString()} related reports · {excludedCount.toLocaleString()}{" "}
            excluded · review status: AI draft
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={exportExcluded} disabled={excludedCount === 0}>
            Export excluded (audit)
          </Button>
          <Button onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>
                  <button
                    type="button"
                    onClick={() => sortBy(c.key)}
                    className="inline-flex items-center gap-1 font-semibold"
                  >
                    {c.label}
                    <ArrowUpDown className="h-3 w-3" aria-hidden />
                  </button>
                </TableHead>
              ))}
              <TableHead>Post</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.report_id}>
                <TableCell className="tabular font-medium">{r.report_id}</TableCell>
                <TableCell>{r.result.urg}</TableCell>
                <TableCell>{r.result.cat}</TableCell>
                <TableCell>{r.result.places[0]?.name ?? "—"}</TableCell>
                <TableCell>{r.result.conf}</TableCell>
                <TableCell className="max-w-[40ch] truncate">{r.clean_text}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
