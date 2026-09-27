"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageSquareText, Send, TriangleAlert, X } from "lucide-react";
import type { Answer, Profile } from "@/lib/ai/schema";
import { chime } from "@/lib/feedback";
import type { Report } from "@/lib/pipeline/reports";

type Turn = { question: string; answer?: Answer };

/** Questions worth one click — they show what the analyst is for. */
const SUGGESTIONS = [
  "Which First Nations communities are affected?",
  "What do people most need right now?",
  "Which roads or bridges are reported closed?",
  "Where are the critical reports concentrated?",
];

const STOP = new Set([
  "the","a","an","is","are","was","were","of","in","on","at","to","for","and","or","what","which",
  "who","where","how","many","much","do","does","did","any","there","that","this","it","be","been",
  "report","reports","me","tell","show","about","from","with","have","has",
]);

/**
 * Send the reports that bear on the question rather than all of them. Fewer
 * reports means a faster answer, and everything the model sees is still real data.
 */
function pickRelevant(reports: Report[], question: string, cap: number): Report[] {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const order = { critical: 0, urgent: 1, information: 2 } as const;
  return reports
    .map((r) => {
      const hay = `${r.clean_text} ${r.result.cat} ${r.result.places[0]?.name ?? ""} ${
        r.result.fn ?? ""
      } ${r.result.needs.join(" ")}`.toLowerCase();
      let score = 0;
      for (const t of terms) if (hay.includes(t)) score += 1;
      return { r, score: score * 10 + (2 - order[r.result.urg]) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map((x) => x.r);
}

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  reports: Report[];
  profile: Profile | null;
  onCite: (id: string) => void;
  /** Lifts the launcher above the phone bottom sheet. */
  launcherBottom: number;
};

/** Floating analyst chat. The window is the forwarded ref so the map can pad around it. */
export const ChatWidget = forwardRef<HTMLDivElement, Props>(function ChatWidget(
  { open, setOpen, reports, profile, onCite, launcherBottom },
  ref,
) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, Answer>());
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading || !reports.length) return;
    setDraft("");
    const key = q.toLowerCase();
    const hit = cache.current.get(key);
    if (hit) {
      setTurns((t) => [...t, { question: q, answer: hit }]);
      return;
    }
    setTurns((t) => [...t, { question: q }]);
    setLoading(true);
    try {
      const context = pickRelevant(reports, q, 45).map((r) => ({
        id: r.report_id,
        text: r.clean_text.slice(0, 140),
        cat: r.result.cat,
        urg: r.result.urg,
        place: r.result.places[0]?.name,
        fn: r.result.fn,
        needs: r.result.needs.length ? r.result.needs : undefined,
      }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "ask", input: { question: q, reports: context }, profile }),
      });
      if (!res.ok) throw new Error("ask failed");
      const answer = (await res.json()).data as Answer;
      cache.current.set(key, answer);
      chime();
      setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, answer } : turn)));
    } catch {
      setTurns((t) =>
        t.map((turn, i) =>
          i === t.length - 1
            ? {
                ...turn,
                answer: { answer: "That didn't go through. Try again.", cited_report_ids: [], grounded: false },
              }
            : turn,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open analyst chat"
          style={{ bottom: launcherBottom }}
          className="neon-button fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-2xl transition-[bottom] duration-300"
        >
          <MessageSquareText className="h-6 w-6" aria-hidden />
        </button>
      )}

      {open && (
        <div
          ref={ref}
          role="dialog"
          aria-label="Analyst chat"
          className="neon-card fixed inset-x-2 top-2 bottom-2 z-40 flex flex-col overflow-hidden
            md:inset-x-auto md:top-auto md:right-4 md:bottom-4 md:h-[min(600px,calc(100dvh-2rem))] md:w-[min(400px,calc(100vw-2rem))]"
        >
          <header className="flex items-center gap-3 border-b border-cyan-400/15 px-4 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/40 bg-cyan-400/10">
              <Bot className="h-4 w-4 text-cyan-300" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="neon-text text-sm font-bold uppercase tracking-[0.18em]">Analyst</p>
              <p className="text-[11px] text-cyan-50/50">Answers only from the loaded reports</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-cyan-50/60 hover:text-cyan-100"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={scroller} className="hud-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-cyan-50/60">
                  {reports.length
                    ? "Ask about what's in the reports. Try one of these:"
                    : "Load a dataset first — the analyst reads the reports on the map."}
                </p>
                {reports.length > 0 &&
                  SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void ask(s)}
                      className="block w-full rounded-xl border border-cyan-400/20 px-3 py-2 text-left text-sm hover:border-cyan-300/60 hover:bg-cyan-400/5"
                    >
                      {s}
                    </button>
                  ))}
              </div>
            )}

            {turns.map((turn, i) => (
              <div key={i} className="space-y-2">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-400 px-3 py-2 text-sm font-medium text-[#031016]">
                  {turn.question}
                </p>
                {turn.answer ? (
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-cyan-400/20 bg-black/30 px-3 py-2.5 text-sm leading-relaxed">
                    {!turn.answer.grounded && (
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-amber-300">
                        <TriangleAlert className="h-3.5 w-3.5" /> Not fully answered by the reports
                      </p>
                    )}
                    {turn.answer.answer}
                    {turn.answer.cited_report_ids.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {turn.answer.cited_report_ids.slice(0, 8).map((id) => (
                          <button
                            key={id}
                            type="button"
                            data-silent
                            onClick={() => onCite(id)}
                            className="rounded-md border border-cyan-400/30 px-1.5 py-0.5 text-[11px] text-cyan-200 hover:border-cyan-300 hover:shadow-[0_0_8px_rgba(34,211,238,.4)]"
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-cyan-50/55">
                    <Loader2 className="h-4 w-4 animate-spin" /> Reading reports…
                  </p>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
            className="flex items-center gap-2 border-t border-cyan-400/15 p-3"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about the reports"
              disabled={!reports.length}
              className="h-11 min-w-0 flex-1 rounded-xl border border-cyan-400/20 bg-black/30 px-3 text-sm outline-none placeholder:text-cyan-50/35 focus:border-cyan-300/70"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim() || loading}
              className="neon-button grid h-11 w-11 place-items-center rounded-xl disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
});
