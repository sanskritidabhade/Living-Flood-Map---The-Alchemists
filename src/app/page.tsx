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
import { cleanRows, type CleanRow } from "@/lib/pipeline/clean";
import type { IngestResult } from "@/lib/pipeline/ingest";
import { buildReports, type Report } from "@/lib/pipeline/reports";

type Step = "start" | "brief" | "sorting" | "explorer";
type Tab = "explorer" | "dataset";

const MODEL = "gemini-3-flash-preview (mock)";

/** Slice 1: the whole flow on mocks. No Leaflet, no live AI. */
export default function Home() {
  const [step, setStep] = useState<Step>("start");
  const [tab, setTab] = useState<Tab>("explorer");

  const [rows, setRows] = useState<CleanRow[]>([]);
  const [hasTime, setHasTime] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  const [stage, setStage] = useState<SortStage>("Reading tweets");
  const [done, setDone] = useState(0);
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
    setHasTime(result.hasTime);
    setStage("Reading tweets");
    setStep("sorting");
    setDone(0);
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

  async function sortTweets(confirmed: Profile) {
    setProfile(confirmed);
    setStep("sorting");
    setStage("Reading tweets");
    setDone(0);
    setFound(0);

    try {
      const cached = sessionStorage.getItem("lfm-sample");
      let classified: Classified[];
      let places: ResolvedPlace[];
      let verifications: Verification[];

      if (cached) {
        const sample = JSON.parse(cached);
        classified = sample.classify.results;
        places = sample.places.places;
        verifications = sample.verify.verifications;
        // Walk the counter so the stages are visible, per DESIGN.md loading rules.
        for (let i = 0; i <= rows.length; i += Math.max(1, Math.ceil(rows.length / 10))) {
          setDone(Math.min(i, rows.length));
          setFound(classified.slice(0, i).filter((c) => c.rel).length);
          await new Promise((r) => setTimeout(r, 60));
        }
      } else {
        const batch = (await postTask(
          "classify",
          { tweets: rows.slice(0, 100).map((r, i) => ({ i, text: r.clean_text })) },
          confirmed,
        )) as { results: Classified[] };
        classified = batch.results;
        setDone(rows.length);
        setFound(classified.filter((c) => c.rel).length);

        setStage("Finding places");
        const resolved = (await postTask("places", { places: [] }, confirmed)) as {
          places: ResolvedPlace[];
        };
        places = resolved.places;

        const verified = (await postTask("verify", { tweets: [] }, confirmed)) as {
          verifications: Verification[];
        };
        verifications = verified.verifications;
      }

      setStage("Placing on map");
      await new Promise((r) => setTimeout(r, 400));

      const built = buildReports(rows, classified, places, verifications);
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
    return <SortingScreen stage={stage} done={done} total={rows.length} found={found} />;
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
        <Explorer reports={reports} hasTime={hasTime} />
      ) : (
        <DatasetTable reports={reports} model={MODEL} />
      )}
    </div>
  );
}
