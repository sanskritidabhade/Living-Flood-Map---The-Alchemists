# Living Flood Map (personal project)

Turns a CSV of disaster-time social posts into a map of where it is happening. Started at the Thunder Bay AI Hackathon (Sept 2026); now a personal project. The UI is being redesigned from a bare shell.

## Stack
Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, lucide-react, zod, sonner, Mapbox GL JS (Leaflet fallback).
Commands: `npm run dev`, `npm run build`, `npm run lint`.

## Where things live
- `src/lib/use-flood-map.ts` the whole pipeline as one hook; UI reads state from it.
- `src/lib/pipeline/` ingest, clean, sieve, classify batches, places, export.
- `src/lib/ai/` prompts.ts, schema.ts, client.ts. `src/app/api/ai/route.ts` is the only place the AI is called.
- `src/components/map-view.tsx` picks Mapbox (`mapbox-map.tsx`) when `NEXT_PUBLIC_MAPBOX_TOKEN` is set, else Leaflet. Pin styling in `map-pins.ts`.
- `mocks/` fake AI responses. `public/sample/` precomputed sample (zero AI calls).

## AI API rules
- `.env.local`: HACKATHON_API_URL, HACKATHON_API_KEY, AI_MODEL, USE_MOCK (default true), NEXT_PUBLIC_MAPBOX_TOKEN.
- The API key stays on the server. Never NEXT_PUBLIC_, never in client code, never committed.
- Live calls go through the `.cache/` file cache. Never call the AI in loops, on page load, or in tests.

## Working rules
- Small steps; commit after each working step.
- Never run destructive git/rm commands without asking. Ask before adding dependencies or big refactors.
- Keep replies short.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
