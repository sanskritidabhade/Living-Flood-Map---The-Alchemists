"use client";

import { useRef, useState } from "react";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Answer, Profile } from "@/lib/ai/schema";
import type { Report } from "@/lib/pipeline/reports";

type Turn = {
  question: string;
  answer?: Answer;
  at?: string;
};

/** Questions worth one click — they show an analyst what this is for. */
const SUGGESTIONS = [
  "Which First Nations communities are affected?",
  "What do people most need right now?",
  "Which roads or bridges are reported closed?",
  "Where are the critical reports concentrated?",
];

export function AnalystChat({
  reports,
  profile,
  onCite,
}: {
  reports: Report[];
  profile: Profile | null;
  onCite: (reportId: string) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setValue("");
    setTurns((t) => [...t, { question: q }]);
    setLoading(true);
    try {
      // Critical and urgent first so the most important reports survive the cap.
      const order = { critical: 0, urgent: 1, information: 2 } as const;
      const context = [...reports]
        .sort((a, b) => order[a.result.urg] - order[b.result.urg])
        .slice(0, 120)
        .map((r) => ({
          id: r.report_id,
          text: r.clean_text.slice(0, 180),
          cat: r.result.cat,
          urg: r.result.urg,
          place: r.result.places[0]?.name,
          role: r.result.places[0]?.role,
          fn: r.result.fn,
          needs: r.result.needs,
        }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "ask", input: { question: q, reports: context }, profile }),
      });
      if (!res.ok) throw new Error("ask failed");
      const body = await res.json();
      setTurns((t) =>
        t.map((turn, i) =>
          i === t.length - 1
            ? { ...turn, answer: body.data as Answer, at: new Date().toLocaleTimeString("en-CA") }
            : turn,
        ),
      );
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      toast.error("That question could not be answered. The reports are still on the map.");
      setTurns((t) => t.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Ask about these reports
        </p>
        <p className="tabular mt-1 text-xs text-muted-foreground">
          Answers come only from the {Math.min(reports.length, 120).toLocaleString()} reports
          matching your current filters.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 ? (
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={reports.length === 0}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {turns.map((turn, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-auto w-fit max-w-[85%] rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              {turn.question}
            </p>

            {turn.answer ? (
              <div className="lfm-enter rounded-md border border-border bg-background p-3">
                <p className="text-sm leading-relaxed">{turn.answer.answer}</p>

                {turn.answer.cited_report_ids.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Based on</span>
                    {turn.answer.cited_report_ids.slice(0, 8).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onCite(id)}
                        className="tabular rounded-sm border border-border px-1.5 py-0.5 text-xs font-medium hover:bg-muted"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                ) : null}

                <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                  {turn.answer.grounded
                    ? `AI-generated · ${turn.at} · answered from the reports above`
                    : `AI-generated · ${turn.at} · not answerable from these reports`}
                </p>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Reading the reports…
              </p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(value);
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask a question about these reports"
          aria-label="Ask a question about these reports"
          disabled={reports.length === 0}
        />
        <Button type="submit" size="icon" disabled={loading || !value.trim()} aria-label="Send">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CornerDownLeft className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </form>
    </div>
  );
}
