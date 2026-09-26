"use client";

import { useRef, useState } from "react";
import { FileUp, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseCsv, type IngestResult } from "@/lib/pipeline/ingest";

type Props = {
  onSample: () => void;
  onConfirmColumns: (result: IngestResult, csvName: string) => void;
};

export function StartScreen({ onSample, onConfirmColumns }: Props) {
  const [parsed, setParsed] = useState<IngestResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError("");
    try {
      const result = parseCsv(await file.text());
      if (result.rows.length === 0) {
        setError("That file has no rows we can read. Check it has a header and at least one post.");
        return;
      }
      setFileName(file.name);
      setParsed(result);
    } catch {
      setError("That file could not be parsed as CSV. Try exporting it again as plain CSV.");
    }
  }

  if (parsed) {
    const preview = parsed.rows.slice(0, 5);
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-secondary">
            Check the columns
          </h1>
          <p className="mt-2 text-muted-foreground">
            {fileName} — {parsed.rows.length.toLocaleString()} rows.
            {parsed.truncated ? "" : ""}
          </p>
        </div>

        {parsed.truncated ? (
          <p className="rounded-sm border border-border bg-muted px-3 py-2 text-sm">
            Large dataset — processing the first 20,000 rows.
          </p>
        ) : null}

        {parsed.mapping.label ? (
          <p className="rounded-sm border border-border bg-muted px-3 py-2 text-sm">
            Found a label column ({parsed.mapping.label}). It is hidden from the AI and used only
            to score accuracy afterwards.
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Table2 className="h-4 w-4" aria-hidden />
              We will read the post text from <code className="font-semibold">{parsed.mapping.text}</code>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Columns found: {parsed.columns.join(", ")}</li>
              <li>
                Timestamps:{" "}
                {parsed.hasTime
                  ? `yes (${parsed.mapping.timestamp})`
                  : "none — the map will show where reports concentrate, not how they spread over time"}
              </li>
            </ul>
            <div className="rounded-sm border border-border bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                First five rows
              </p>
              <ol className="space-y-2 text-sm">
                {preview.map((row, i) => (
                  <li key={i} className="line-clamp-2">
                    {row[parsed.mapping.text]}
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={() => onConfirmColumns(parsed, fileName)}>Read this file</Button>
          <Button variant="ghost" onClick={() => setParsed(null)}>
            Choose another file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-secondary">Living Flood Map</h1>
        <p className="max-w-[70ch] text-muted-foreground">
          Drop in a CSV of posts from a disaster. The app works out what the event is, sorts real
          reports from noise, and pins each one where it happened.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className="rounded-md border border-dashed border-border bg-surface p-10 text-center"
      >
        <FileUp className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="mt-3 font-semibold">Drop a CSV here</p>
        <p className="mt-1 text-sm text-muted-foreground">or</p>
        <Button variant="ghost" className="mt-3" onClick={() => inputRef.current?.click()}>
          Choose a file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Upload a CSV of posts"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {error ? <p className="mt-4 text-sm font-medium text-danger-text">{error}</p> : null}
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button onClick={onSample}>Try the Alberta 2013 sample</Button>
        <p className="text-sm text-muted-foreground">
          Data stays in your browser. Nothing is shared.
        </p>
      </div>
    </div>
  );
}
