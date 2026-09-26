"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatasetTable } from "@/components/dataset-table";
import { EventBriefCard } from "@/components/event-brief-card";
import { Explorer } from "@/components/explorer";
import { SortingScreen, type SortStage } from "@/components/sorting-screen";
import { OcapGate } from "@/components/ocap-gate";
import { StartScreen } from "@/components/start-screen";
import type { Classified, Profile, ResolvedPlace, Verification } from "@/lib/ai/schema";
import { classifyAll, fanOutToDuplicates, type ClassifiedRow } from "@/lib/pipeline/batch";
import { FALLBACK_BANNER, quickSort } from "@/lib/pipeline/fallback";
import {
  DEFERRED_REASON,
  droppedResult,
  placeCandidates,
  sieve,
} from "@/lib/pipeline/sieve";
import { cleanRows, sampleForProfile, type CleanRow } from "@/lib/pipeline/clean";
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
  // Always starts locked. Reading sessionStorage here would make the server and
  // client render different trees, and the resulting hydration mismatch makes
  // React rebuild the whole page. Re-entry after a refresh is the intended
  // behaviour anyway.
  const [unlocked, setUnlocked] = useState(false);
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
      // 60 tweets is plenty to identify an event, and returns far quicker than 150.
      const sampled = sampleForProfile(cleaned.unique, 60).map((r) => r.clean_text);
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
    console.log(`[places] sending ${missing.length} place names to resolve`);
    if (missing.length === 0) {
      console.log("[places] nothing to resolve — no place names were extracted");
      return known;
    }
    try {
      const resolved = (await postTask("places", { places: missing }, withProfile)) as {
        places: ResolvedPlace[];
      };
      // The model often returns a tidied name ("Memorial Drive, Calgary") for
      // what we asked about ("Memorial Drive"). Reports are joined on the name
      // the classifier produced, so store each result under the requested name.
      const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const unclaimed = [...resolved.places];
      const merged = [...known];
      const seen = new Set(have);

      for (const name of missing) {
        const n = norm(name);
        let at = unclaimed.findIndex((p) => norm(p.name) === n);
        if (at === -1) {
          at = unclaimed.findIndex((p) => {
            const pn = norm(p.name);
            return pn.startsWith(n) || n.startsWith(pn) || pn.includes(n) || n.includes(pn);
          });
        }
        if (at === -1) continue;
        const [hit] = unclaimed.splice(at, 1);
        if (!seen.has(name)) {
          merged.push({ ...hit, name });
          seen.add(name);
        }
      }
      console.log(
        `[places] resolved ${merged.length - known.length} of ${missing.length} names`,
      );
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
        // Four repaints, not ten: each one rebuilds the marker layer, and the
        // sample is precomputed so there is nothing to wait for.
        const chunks = 4;
        const step = Math.max(1, Math.ceil(rows.length / chunks));
        setStep("explorer");
        for (let i = step; i <= rows.length + step; i += step) {
          const seen = Math.min(i, rows.length);
          setDone(seen);
          setFound(classified.slice(0, seen).filter((c) => c.result.rel).length);
          setReports(buildReports(classified.slice(0, seen), places, verifications));
          await new Promise((r) => setTimeout(r, 90));
        }
        // No classify, places or verify calls on this path — every field is precomputed.
      } else {
        // A local keyword pass first: on the provided dataset this resolves
        // ~45% of tweets without a model call, for a measured 1.9% recall loss.
        const { send, dropped, bypassed, deferred } = sieve(unique, confirmed);
        if (bypassed) {
          console.log("[sieve] bypassed — event vocabulary not recognised, sending everything");
        } else if (dropped.length > 0) {
          toast.info(
            `${dropped.length.toLocaleString()} posts had no event keywords — sorted locally, no AI call.`,
          );
        }
        if (deferred.length > 0) {
          toast.info(
            `Large file: reading the ${send.length.toLocaleString()} most informative posts first.`,
          );
        }
        // Only the rows actually going to the model drive the progress bar, so
        // the estimate reflects real work rather than the whole file.
        setTotal(send.length);
        setDone(0);

        /**
         * Places have to be resolved *while* classifying, not after. Passing an
         * empty list here meant the map read "No locations found" for the whole
         * run — minutes, on a large file — even though reports were arriving.
         * Each round resolves whatever new names have appeared, capped so a big
         * file cannot run away with credits.
         */
        let placesSoFar: ResolvedPlace[] = [];
        /**
         * Coordinates are fetched up front from locally-extracted candidates, so
         * the first classify batch already has somewhere to put its pins. Waiting
         * for a full classify round before asking for places is what made the map
         * sit empty for minutes on a large file.
         */
        try {
          const candidates = placeCandidates(send, confirmed);
          if (candidates.length > 0) {
            setStage("Finding places");
            const upfront = (await postTask("places", { places: candidates }, confirmed)) as {
              places: ResolvedPlace[];
            };
            placesSoFar = upfront.places;
            console.log(`[places] pre-resolved ${placesSoFar.length} of ${candidates.length}`);
          }
        } catch {
          // Not fatal: streaming resolution below still fills these in.
        }
        setStage("Reading tweets");
        let placeCallsMade = 0;
        let placeCallInFlight = false;
        const MAX_STREAMING_PLACE_CALLS = 6;
        const MIN_NEW_NAMES = 4;

        const resolveAsWeGo = async (rowsSoFar: ClassifiedRow[]) => {
          if (placeCallInFlight || placeCallsMade >= MAX_STREAMING_PLACE_CALLS) return;
          const known = new Set(placesSoFar.map((pl) => pl.name));
          const fresh = uniquePlaceNames(rowsSoFar).filter((n) => !known.has(n));
          if (fresh.length < MIN_NEW_NAMES) return;

          placeCallInFlight = true;
          placeCallsMade += 1;
          try {
            placesSoFar = await resolveMissingPlaces(rowsSoFar, placesSoFar, confirmed);
            setReports(buildReports(rowsSoFar, placesSoFar, new Map()));
          } finally {
            placeCallInFlight = false;
          }
        };

        const { rows: classifiedUnique, failedBatches, aiUnavailable } = await classifyAll(
          send,
          confirmed,
          (p) => {
            setDone(p.done);
            setFound(p.found);
            // Pins land with whatever coordinates we already have.
            setReports(buildReports(p.rows, placesSoFar, new Map()));
            setStep("explorer");
            void resolveAsWeGo(p.rows);
          },
        );
        if (aiUnavailable) {
          // Three failures in a row: finish the job without the model rather
          // than dead-ending in front of a judge.
          const scored = quickSort(send, confirmed);
          classifiedUnique.push(
            ...scored
              .map((result, i) => (send[i] ? { ...send[i], result } : undefined))
              .filter((r): r is ClassifiedRow => r !== undefined),
          );
          setFallback(true);
          toast.warning(FALLBACK_BANNER);
        } else if (failedBatches.length) {
          toast.warning(
            `${failedBatches.length} batches could not be read. The rest are on the map.`,
          );
        }
        // Locally-dropped rows rejoin here so they stay in the dataset and the
        // Excluded audit export, rather than vanishing.
        const localRows: ClassifiedRow[] = [
          ...dropped.map((row, i) => ({ ...row, result: droppedResult(i) })),
          ...deferred.map((row, i) => ({
            ...row,
            result: droppedResult(i, DEFERRED_REASON),
          })),
        ];
        // Duplicates and retweets inherit their group's classification.
        classified = fanOutToDuplicates(rows, [...classifiedUnique, ...localRows]);

        setStage("Finding places");
        places = await resolveMissingPlaces(classified, placesSoFar, confirmed);

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
      const withPlace = built.filter((r) => r.place).length;
      const roles = built.reduce<Record<string, number>>((a, r) => {
        const role = r.result.places[0]?.role ?? "none";
        a[role] = (a[role] ?? 0) + 1;
        return a;
      }, {});
      console.log(
        `[join] ${withPlace}/${built.length} reports got coordinates from ${places.length} places`,
        roles,
      );
      setReports(built);
      setStage("Done");
      setStep("explorer");
      toast.success(`${built.filter((r) => r.result.rel).length} reports on the map`);
    } catch {
      toast.error("Sorting stopped partway. Nothing was lost — try again.");
      setStep("brief");
    }
  }

  if (!unlocked) {
    return <OcapGate onUnlock={() => setUnlocked(true)} />;
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
