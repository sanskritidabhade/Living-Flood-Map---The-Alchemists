# Living Flood Map — System Design

Challenge sponsor: CE Strategies (Thunder Bay / Winnipeg). See `docs/CHALLENGE.md`.

## 1. Problem

Flood sensors and satellite imagery miss what happens on the ground. A submerged road or a
flooded home is usually posted to social media hours before any official layer registers it.
We take a CSV of tweets from a disaster window, separate signal from noise, pull out where
each relevant tweet is talking about, and put it on an interactive map that a community
member, band council or responder can read at a glance.

## 2. Users

- **Community member** — "is my road out?" Opens the map, looks at their area.
- **Emergency coordinator** — needs the overview: where is activity concentrated, what is
  new in the last hour, what is getting worse.
- **GIS analyst (CE Strategies / MapAki)** — the one person who decides when a snapshot is
  clean enough to leave the tool as GeoJSON and land in a real GIS layer.

## 3. Trust model

During a flood, latency is the harm. A queue of tweets waiting on a human to tick "approve"
means the map is always behind the water. So the map is live and the audit gate sits at the
boundary where data leaves us.

**Results appear immediately.** Every tweet the classifier marks relevant is plotted as soon
as the batch finishes. There is no per-tweet approval step and no approval queue.

**Confidence drives pin style** — the map tells you how much to trust it without anyone
grading it first:

| Confidence | Pin style | Reading |
|---|---|---|
| High (≥ 0.80) | Solid fill, full opacity | Location is explicit and unambiguous |
| Medium (0.50–0.79) | Outlined, no fill | Plausible, worth a look, not confirmed |
| Low (< 0.50) | Dimmed to 30%, hidden by default behind a "show low confidence" toggle | Guesswork — visible only if the user asks |

**The situation brief is shown immediately**, generated from the relevant tweets, and is
labelled **"AI-generated"** in the header with a timestamp. No one approves it before it
renders. It is a reading aid, not a record.

**Correction is real time, not upfront.** Any user can act on a pin in place:

- **Flag** — "not flood related" / "wrong location" / "duplicate". A flagged pin dims and
  drops out of the default view instantly. No moderator round trip.
- **Correct** — drag the pin to the right spot, or fix the extracted place name. The edit is
  attributed and takes effect immediately.

Flags and corrections are recorded against the row, so the export carries the community's
fixes, not just the model's guesses.

**The one approval gate is export.** Nothing leaves this tool as a GIS artifact without a
named human. See §8.

> Note: this relaxes the kit's default "nothing is saved or acted on without human approval"
> pattern for *display*. Nothing is sent or acted on — the map is a view. The approval
> requirement is preserved exactly where it has teeth: the GeoJSON export.

## 4. Architecture

```
CSV upload ──► parse + dedupe ──► /api/ai (server only) ──► classify + geocode + confidence
                                        │
                                        ▼
                              in-memory dataset (per session)
                                        │
                      ┌─────────────────┼─────────────────┐
                      ▼                 ▼                 ▼
                 map + pins      situation brief     table / filters
                      │
                      ▼
              flag / correct (local, instant)
                      │
                      ▼
              Publish ──► GeoJSON download (stamped)
```

- Next.js App Router, TypeScript, Tailwind, shadcn/ui.
- `src/app/api/ai/route.ts` is the only place the model is called. Key stays server side.
- Map: react-leaflet + OpenStreetMap tiles. No account, no key, free.
- No database. The dataset lives in the session; export is the persistence story.

## 5. AI pipeline

One call per batch of tweets, not one per tweet. Structured JSON via the organizers'
`response_schema` option.

For each tweet the model returns:

- `relevant` (bool) and `relevance_confidence` (0–1)
- `category` — road/bridge, property, evacuation, rescue request, utility, other
- `location_text` — the place as written in the tweet, or null
- `lat` / `lon` — resolved coordinates, or null
- `location_confidence` (0–1)
- `evidence` — the span of the tweet that justifies the call

Geocoding resolves `location_text` against a gazetteer scoped to the event region. A tweet
with no resolvable place is kept in the list and the table but is not plotted.

Mocks in `mocks/` cover the whole flow so the demo runs with `USE_MOCK=true`.

## 6. Dataset columns

Input CSV is a single `tweet` column (the provided dataset) or any CSV with a detectable
text column. Judges will upload an unseen file, so column detection must not assume a name.

Working row shape:

| Column | Source | Notes |
|---|---|---|
| `id` | derived | Row hash, stable across re-runs |
| `tweet` | input | Raw text, never modified |
| `relevant` | AI | bool |
| `relevance_confidence` | AI | 0–1 |
| `category` | AI | Enum, drives filtering |
| `location_text` | AI | As written in the tweet |
| `lat`, `lon` | geocode | Null if unresolved |
| `location_confidence` | AI + geocode | Drives pin style per §3 |
| `evidence` | AI | Quoted span |
| `review_status` | system | **Defaults to `"AI draft"`.** Becomes `"flagged"` when a user flags it, `"corrected"` when a user edits it, `"published"` on export |
| `flag_reason` | user | Null unless flagged |
| `corrected_by` | user | Null unless edited |

Every row starts at **`"AI draft"` and is live on the map at that status.** `"AI draft"` is
not a holding state — it means "shown, model-sourced, not yet signed off". Export does not
require any row to be individually reviewed; it requires **one analyst to click Publish**.

## 7. Map and exploration

- Pins styled by confidence (§3), clustered at low zoom.
- Filters: category, confidence band, relevant-only (default on), show-flagged toggle.
- Situation brief in a side panel, labelled AI-generated, regenerates on filter change.
- Table view beside the map; clicking a row flies to its pin and back.
- Dev-only badge shows MOCK, or LIVE with `requests_remaining`.

## 8. Export and audit

The GeoJSON export is the only gate in the system.

**One click.** The analyst presses **Publish**, confirms in a single dialog that names what
is going out ("428 relevant pins, 31 flagged and excluded, 12 corrected"), and the file
downloads. There is no per-row checklist and no second approver.

On publish the export is stamped:

- `reviewed_by` — the analyst's name, entered once and remembered for the session
- `reviewed_at` — ISO timestamp of the click
- `source` — filename and row count of the input CSV
- `model` and `prompt_version`
- Counts of flagged and corrected rows, so the receiving GIS layer knows the map was touched

Each feature carries its `review_status`, `location_confidence` and `evidence`, so anything
downstream can re-filter on confidence without coming back to us. Flagged rows are excluded
from the export by default and listed in the stamp.

Unpublished sessions leave nothing behind. If no one clicks Publish, nothing persists —
which is the honest version of "nothing is acted on without a human".
