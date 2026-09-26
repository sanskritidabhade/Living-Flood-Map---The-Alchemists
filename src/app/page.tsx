"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatasetTable } from "@/components/dataset-table";
import { EventBriefCard } from "@/components/event-brief-card";
import { Explorer } from "@/components/explorer";
import { SortingScreen, type SortStage } from "@/components/sorting-screen";
import { StartScreen } from "@/components/start-screen";
import type { Classified, Profile, ResolvedPlace, Verification } from "@/lib/ai/schema";
import { classifyAll, fanOutToDuplicates, type ClassifiedRow } from "@/lib/pipeline/batch";
import { FALLBACK_BANNER, quickSort } from "@/lib/pipeline/fallback";
import { cleanRows, type CleanRow } from "@/lib/pipeline/clean";
import type { IngestResult } from "@/lib/pipeline/ingest";
import {
  attachResults,
  buildReports,
  claimRows,
  uniquePlaceNames,
  type Report,
} from "@/lib/pipeline/reports";

type Step = "start" | "brief" | "sorting" | "explorer";
type Tab = "explorer" | "dataset";

const MODEL = "gemini-3-flash-preview (mock)";

/** Slice 1: the whole flow on mocks. No Leaflet, no live AI. */
export default function Home() {
  const [step, setStep] = useState<Step>("start");
  const [tab, setTab] = useState<Tab>("explorer");

  const [rows, setRows] = useState<CleanRow[]>([]);
  /** One row per duplicate group — this is what actually goes to the model. */
  const [unique, setUnique] = useState<CleanRow[]>([]);
  const [hasTime, setHasTime] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [fallback, setFallback] = useState(false);

  const [stage, setStage] = useState<SortStage>("Reading tweets");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [found, setFound] = useState(0);

  async function postTask(task: string, input: unknown, withProfile?: Profile) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, input, profile: withProfile }),
    });
    if (!res.ok) throw new Error(`${task} failed`);
    return (await res.json()).data;
  }

  /** Sample path: precomputed, so it costs zero credits and loads instantly. */
  async function loadSample() {
    try {
      const res = await fetch("/sample/alberta-2013.json");
      const sample = await res.json();
      const cleaned = cleanRows(
        (sample.tweets as string[]).map((tweet) => ({ tweet })),
        { text: "tweet" },
      );
      setRows(cleaned.rows);
      setUnique(cleaned.unique);
      setHasTime(false);
      setProfile(sample.profile as Profile);
      // Stash the precomputed results so Confirm goes straight to the map.
      sessionStorage.setItem("lfm-sample", JSON.stringify(sample));
      setStep("brief");
    } catch {
      toast.error("The sample could not be loaded. Check public/sample/alberta-2013.json.");
    }
  }

  async function readFile(result: IngestResult) {
    const cleaned = cleanRows(result.rows, result.mapping);
    setRows(cleaned.rows);
    setUnique(cleaned.unique);
    setHasTime(result.hasTime);
    setStage("Reading tweets");
    setStep("sorting");
    setDone(0);
    setTotal(cleaned.unique.length);
    setFound(0);
    try {
      const sampled = cleaned.unique.slice(0, 150).map((r) => r.clean_text);
      const p = (await postTask("profile", { tweets: sampled })) as Profile;
      setProfile(p);
      sessionStorage.removeItem("lfm-sample");
      setStep("brief");
    } catch {
      toast.error("The event could not be read. Try the sample while we look at it.");
      setStep("start");
    }
  }


  /**
   * Names the classifier produced that we have no coordinates for yet.
   * One extra call resolves them all; in mock mode it costs nothing.
   */
  async function resolveMissingPlaces(
    classified: ClassifiedRow[],
    known: ResolvedPlace[],
    withProfile: Profile,
  ): Promise<ResolvedPlace[]> {
    const have = new Set(known.map((p) => p.name));
    const missing = uniquePlaceNames(classified).filter((n) => !have.has(n));
    if (missing.length === 0) return known;
    try {
      const resolved = (await postTask("places", { places: missing }, withProfile)) as {
        places: ResolvedPlace[];
      };
      const merged = [...known];
      const seen = new Set(have);
      for (const p of resolved.places) {
        if (!seen.has(p.name)) {
          merged.push(p);
          seen.add(p.name);
        }
      }
      return merged;
    } catch {
      // Losing coordinates is survivable — the reports stay in the unmapped list.
      toast.warning(`${missing.length} place names could not be resolved.`);
      return known;
    }
  }

  async function sortTweets(confirmed: Profile) {
    setProfile(confirmed);
    setStep("sorting");
    setStage("Reading tweets");
    setDone(0);
    setFound(0);

    try {
      const cached = sessionStorage.getItem("lfm-sample");
      let classified: ClassifiedRow[];
      let places: ResolvedPlace[];
      const verifications = new Map<string, Verification>();

      if (cached) {
        // Precomputed sample: no AI calls at all.
        const sample = JSON.parse(cached);
        classified = attachResults(rows, sample.classify.results as Classified[]);
        places = sample.places.places as ResolvedPlace[];
        for (const v of sample.verify.verifications as Verification[]) {
          const row = rows[v.i];
          if (row) verifications.set(row.report_id, v);
        }
        setTotal(rows.length);
        const step = Math.max(1, Math.ceil(rows.length / 10));
        setStep("explorer");
        for (let i = step; i <= rows.length + step; i += step) {
          const seen = Math.min(i, rows.length);
          setDone(seen);
          setFound(classified.slice(0, seen).filter((c) => c.result.rel).length);
          // Pins land batch by batch rather than all at once at the end.
          setReports(buildReports(classified.slice(0, seen), places, verifications));
          await new Promise((r) => setTimeout(r, 55));
        }
        // No classify, places or verify calls on this path — every field is precomputed.
      } else {
        // Every unique tweet in the file, in batches of 100, 4 at a time.
        setTotal(unique.length);
        const { rows: classifiedUnique, failedBatches, aiUnavailable } = await classifyAll(
          unique,
          confirmed,
          (p) => {
            setDone(p.done);
            setFound(p.found);
            // Show the map as soon as the first batch lands; pins fill in after.
            setReports(buildReports(p.rows, [], new Map()));
            setStep("explorer");
          },
        );
        if (aiUnavailable) {
          // Three failures in a row: finish the job without the model rather
          // than dead-ending in front of a judge.
          const scored = quickSort(unique, confirmed);
          classifiedUnique.push(
            ...scored
              .map((result, i) => (unique[i] ? { ...unique[i], result } : undefined))
              .filter((r): r is ClassifiedRow => r !== undefined),
          );
          setFallback(true);
          toast.warning(FALLBACK_BANNER);
        } else if (failedBatches.length) {
          toast.warning(
            `${failedBatches.length} batches could not be read. The rest are on the map.`,
          );
        }
        // Duplicates and retweets inherit their group's classification.
        classified = fanOutToDuplicates(rows, classifiedUnique);

        setStage("Finding places");
        places = await resolveMissingPlaces(classified, [], confirmed);

        const claims = claimRows(classified);
        if (claims.length) {
          const verified = (await postTask(
            "verify",
            { tweets: claims.map((row, i) => ({ i, text: row.clean_text })) },
            confirmed,
          )) as { verifications: Verification[] };
          for (const v of verified.verifications) {
            const row = claims[v.i];
            if (row) verifications.set(row.report_id, v);
          }
        }
      }

      setStage("Placing on map");
      await new Promise((r) => setTimeout(r, 400));

      const built = buildReports(classified, places, verifications);
      setReports(built);
      setStage("Done");
      setStep("explorer");
      toast.success(`${built.filter((r) => r.result.rel).length} reports on the map`);
    } catch {
      toast.error("Sorting stopped partway. Nothing was lost — try again.");
      setStep("brief");
    }
  }

  if (step === "start") {
    return <StartScreen onSample={loadSample} onConfirmColumns={readFile} />;
  }

  if (step === "brief" && profile) {
    return <EventBriefCard profile={profile} tweetCount={rows.length} onConfirm={sortTweets} />;
  }

  if (step === "sorting") {
    return <SortingScreen stage={stage} done={done} total={total} found={found} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex gap-1 border-b border-border px-6">
        <Button
          variant={tab === "explorer" ? "secondary" : "ghost"}
          className="rounded-b-none"
          onClick={() => setTab("explorer")}
        >
          Explorer
        </Button>
        <Button
          variant={tab === "dataset" ? "secondary" : "ghost"}
          className="rounded-b-none"
          onClick={() => setTab("dataset")}
        >
          Dataset
        </Button>
      </nav>

      {tab === "explorer" ? (
        <Explorer
          reports={reports}
          hasTime={hasTime}
          profile={profile}
          fallback={fallback}
          progress={stage === "Done" ? null : { done, total }}
        />
      ) : (
        <DatasetTable reports={reports} model={MODEL} />
      )}
    </div>
  );
}
