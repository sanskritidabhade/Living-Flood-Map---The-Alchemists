import { Upload } from "lucide-react";

/** Slice 1 stub: the Start screen. Upload and column mapping land next. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Living Flood Map</h1>
        <p className="max-w-[70ch] text-base text-neutral-600 dark:text-neutral-400">
          Drop in a CSV of posts from a disaster. The app works out what the event is, sorts real
          reports from noise, and pins each one where it happened.
        </p>
      </header>

      <div className="rounded-lg border border-neutral-200 p-8 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-neutral-500" aria-hidden />
          <p className="font-medium">Upload a CSV, or try the sample</p>
        </div>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Data stays in your browser. Nothing is shared.
        </p>
      </div>

      <p className="text-sm text-neutral-500">
        Built for CE Strategies. Exports GeoJSON for MapAki.
      </p>
    </main>
  );
}
