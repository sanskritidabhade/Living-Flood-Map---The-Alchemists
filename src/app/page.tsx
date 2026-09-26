import { Upload } from "lucide-react";

/** Slice 1 stub: the Start screen. Upload and column mapping land next. */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-secondary">Living Flood Map</h1>
        <p className="max-w-[70ch] text-base text-muted">
          Drop in a CSV of posts from a disaster. The app works out what the event is, sorts real
          reports from noise, and pins each one where it happened.
        </p>
      </header>

      <div className="rounded-md border border-border bg-surface p-8">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-muted" aria-hidden />
          <p className="font-semibold">Upload a CSV, or try the sample</p>
        </div>
        <p className="mt-2 text-sm text-muted">Data stays in your browser. Nothing is shared.</p>
        <button
          type="button"
          className="mt-6 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Try the Alberta 2013 sample
        </button>
      </div>

      <p className="text-sm text-muted">Exports GeoJSON for MapAki.</p>
    </main>
  );
}
