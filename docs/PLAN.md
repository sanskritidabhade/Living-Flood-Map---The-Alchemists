# Living Flood Map — plan

Sponsor: CE Strategies (Thunder Bay / Winnipeg — GIS, mapping, community planning for First Nations; software arm MapAki).
One line: drop in a CSV of tweets, the app works out what the disaster is, sorts real reports from noise, pins each report where it happened, and hands the GIS team a layer they can import the same day.

Pitch: **AI turns 8,000 tweets into an actionable map in minutes. The GeoJSON exports directly into MapAki the same day.**

## 1. The challenge

CSV of tweets in (8,024 rows, one `tweet` column, 2013 Alberta floods). Required: classify related vs unrelated, explore with filters and overviews, extract and map locations, custom CSV upload, deployed on Vercel.

Judges upload an unseen CSV — almost certainly another CrisisLexT6 event (Hurricane Sandy, Boston Bombings, Oklahoma Tornado, West Texas Explosion, Queensland Floods). **Nothing may be hardcoded to floods or to Alberta.** Every event-specific value comes from the profile step at runtime.

## 2. Two deliverables, one app

**A — Explorer** (community members, chief and council, emergency responders)
Map-first. Results appear immediately, no approval queue. Confidence drives pin style: high solid, medium outlined, low dimmed and hidden by default. Filters, search, report feed, on-demand situation brief labelled "AI-generated". Anyone can flag or correct a pin in real time.

**B — Verified dataset** (CE Strategies GIS team / MapAki)
Exportable: CSV, XLSX (with data dictionary), GeoJSON. GeoJSON is the bridge — MapAki has no public API, so the file *is* the integration. One approval gate: a single **Publish export** button, one analyst, stamps `reviewed_by`, `reviewed_at` and a correction count.

## 3. Data facts (already profiled)

| Fact | Number | Design consequence |
|---|---|---|
| Rows / columns | 8,024 / 1 (`tweet`) | No time, author or geotag. Where and when come from the text. |
| Exact duplicates | 462 | Classify once, copy to the group. |
| Retweets | 2,225 | Strip `RT @x:`, store `retweet_of`, carry the parent's classification. |
| Unique to classify | ~7,470 | The real AI workload, ~75 batches of 100. |
| Flood-keyword hits | ~4,461 | Real noise exists: #job, #hiring, Canada Day, sports. |
| Top hashtags | #yycflood #abflood #yyc #highriver #siksika #canmore | Feed the fallback scorer. |
| Top places | Calgary 1,672 · Edmonton 201 · downtown 159 · Stampede 126 · High River 99 · Siksika 77 | Edmonton is mostly help origin, not affected → `place_role`. |
| First Nations mentions | ~104 (Siksika, Stoney/Morley, Tsuut'ina) | First-class filter and export column. |
| Timestamps | none | Map shows concentration, not spread. Say so in the UI. Time slider only if an upload has a timestamp column. |

## 4. AI pipeline — 6 tasks, all server-side at `/api/ai`

| # | Task | In → out | Calls |
|---|---|---|---|
| 1 | `profile` | 150 sampled tweets + top hashtags → event type, name, region, country, bounding box, key hashtags, key places, what counts as related | 1 |
| 2 | `classify` | Batches of 100 unique tweets → per-tweet fields (schema below) | ~75 |
| 3 | `places` | Unique normalized place names → lat/lng, precision, inside-region check biased by bounding box. Top 20 optionally verified with Nominatim (1 req/s, cached) | 1–3 |
| 4 | `brief` | Top ≤200 reports in the current filter → situation summary, leads with Critical count | 1 per click |
| 5 | `verify` | Tweets with `claim: true` → claim_type, expected_source + URL, verification_status, confidence | 1–2 |
| 6 | `fallback` | No AI. Keyword scorer from event-brief hashtags + crisis lexicon when the API errors or quota runs out | 0 |

Browser drives the batching, so each server call is short and Vercel never times out; pins land as batches finish. Fallback shows a "Quick sort — not AI checked" banner. The app never dead-ends in front of a judge.

Classify schema (compact keys keep 100 results per call affordable):

```json
{ "i": 0, "rel": true, "conf": "h", "why": "Reports flooding on 17th Ave",
  "cat": "Road or bridge closed", "urg": "critical", "eye": true, "claim": true,
  "places": [{ "text": "17th Avenue", "name": "17 Ave SW Calgary", "type": "street", "role": "affected" }],
  "time": { "text": "last night", "type": "past" },
  "who": "residents in Bowness", "needs": ["sandbags"], "src": "resident", "fn": "Siksika Nation" }
```

**Categories:** Flooding or damage · Road or bridge closed · Evacuation or shelter · People needing help · Official warning or update · Power water and services · Donations and volunteers · Support and sympathy · Other related.

**Urgency:** critical (immediate danger, rescue, infrastructure failure) red · urgent (evacuation routes, shelters, closures) amber · information (donations, sympathy, updates) blue. Always icon + word, never colour alone, per DESIGN.md.

**Source types:** resident · official · media · organization · unknown.

## 5. Claim verification

AI flags only claims about **official status** — dam levels, mandatory evacuation orders, road closures, shelter open/closed, river gauge readings. Community eyewitness reports are never flagged; they are not expected to be authoritative.

`verify` returns `claim_type` (dam_status / evacuation_order / road_closure / shelter_capacity / river_level / other_official), `expected_source`, `expected_source_url`, `verification_status` (verified / unverified / contradicts / cannot_check), `confidence`.

Badge on the report card: green verified · yellow unverified · red contradicts · grey cannot check. Explorer filter: "Show claims needing verification". Mock data pre-seeds 2–3 Alberta 2013 examples where a tweet **contradicts** an official source — that is the visual moment in the video.

## 6. Screens

**Start** — drop a CSV or "Try Alberta 2013 sample" (precomputed, zero credits). Column preview and auto-mapping: detect the text column (`tweet` / `text` / `tweet_text` / `content` / `message`, else longest string column). Optional: id, timestamp, author, lat/lon, label. Line: "Data stays in your browser. Nothing is shared."

**Event brief (Draft)** — editable card: event name, region, key hashtags, what counts as related. Button: "Confirm event and sort tweets".

**Sorting** — stage words ("Reading 7,470 tweets", "Finding places", "Placing on map"), live counter, pins appear as batches land.

**Explorer** — map 60% left, panel right, three tabs.
- Map: pins clustered, coloured by urgency with icon + word, styled by confidence. Default view shows `place_role = affected` only, with a toggle for all. Click a pin → report card slides into the right panel. One honest line: no timestamps in this file, so the map shows concentration, not spread.
- **Tab 1 Reports** — filter bar: urgency, category, eyewitness only, First Nations community, confidence, verification status, search. Report card shows the original tweet with `place_text` highlighted, structured fields alongside, a confidence badge per field, and a verification badge when the tweet made a claim. *This is the one memorable moment from DESIGN.md: messy tweet on the left, clean structured draft on the right, evidence linked.*
- **Tab 2 Situation brief** — on-demand button, reads the current filter, leads with the Critical count, labelled "AI-generated — not verified", cached per filter.
- **Tab 3 Evacuation routes** — pick an affected place or First Nations community from a dropdown built from the classified reports. Route card: From → To (nearest safe city outside the flood zone) · distance · drive time · shelter or reception centre · highway. "Export evacuation plan" prints one plain-language page, Canadian date format. Inside/outside is decided by the profile bounding box, so it adapts to any event. Mock seeds: Siksika Nation → Calgary Enmax Centre 88 km ~1h Hwy 1 · High River → Okotoks rec centre 18 km ~20 min Hwy 2 · Canmore → Cochrane 75 km ~50 min Hwy 1A · Bowness → Edmonton 300 km ~3h Hwy 2.

**Dataset** (top nav, once sorting is done) — sortable table, same filters, exports CSV / XLSX / GeoJSON. **Publish export** → analyst enters name → stamps reviewed-by and reviewed-at → downloads unlock. One-line note: "This file is ready to import as a layer in MapAki."

## 7. Export columns (deliverable B)

- **Identity** report_id, source_row, text, clean_text, is_retweet, echo_count, hashtags, link_count
- **Relevance** relevant, relevance_confidence, relevance_reason
- **What** category, urgency, firsthand, needs
- **Verification** claim_type, expected_source, expected_source_url, verification_status, verification_confidence
- **Where** place_text (exact substring), place_name, place_type, place_role, lat, lng, location_precision, first_nation_community
- **When** time_text, time_type, posted_at (only if the upload had timestamps)
- **Who** who_affected, source_type
- **Trust** review_status (default `AI draft`), reviewed_by, reviewed_at, changed_fields, model, processed_at

XLSX sheets: Reports · Excluded (count + reasons) · Data dictionary · Run info.

## 8. MapAki integration

MapAki has no public API, so GeoJSON export *is* the integration. In the video: show the file, say it drops into MapAki as a new flood-event layer the same day. Reference the Emergency Mapping use case on cestrategies.ca/mapaki/.

## 9. Privacy and data sovereignty

- No database. Uploads stay in the browser session. Only tweet text goes to the AI.
- Personal @handles replaced with `@user` in exports by default, with a toggle for agencies.
- Home-level locations rounded to street or neighbourhood precision on the map.
- Pins labelled "Community report — not verified".
- Excluded tweets stay auditable in the Excluded sheet (XPawn's auditable-AI stance).
- Respect **OCAP** (Ownership, Control, Access, Possession) — First Nations data sovereignty. Say it in the video and the README.

## 10. Stack

Next.js App Router + TypeScript, Tailwind, shadcn/ui, lucide-react, zod, sonner. Added: `papaparse`; `leaflet` + `react-leaflet` + `leaflet.markercluster` (via `next/dynamic`, `ssr: false`, CARTO Positron basemap, attribution shown); `xlsx` (SheetJS).

```
src/lib/ai/        prompts.ts  schema.ts  client.ts
src/lib/pipeline/  ingest.ts  clean.ts  batch.ts  fallback.ts  export.ts
src/app/api/ai/    route.ts          ← the only place the AI is called
mocks/             profile.json  classify.json  places.json  brief.json  verify.json  evacuation.json
data/samples/      alberta-2013.csv  expected.json
public/sample/     alberta-2013.json ← precomputed, zero credits on demo
```

## 11. Build order

| Slice | By | Done when |
|---|---|---|
| 1 | ~11:00 | Upload → column mapping → clean/dedupe → mocked sort → report feed + table → CSV export. End to end. Ugly is fine. |
| 2 | ~12:30 | Map with clustered pins coloured by urgency, filters, event brief card, report card with highlighted evidence, evacuation routes on mock data. |
| 3 | 12:30–2:00 | Live AI, place resolution, situation brief, verification badges, GeoJSON + XLSX, precomputed sample, fallback mode, accuracy score if time. |

**2:00 PM code freeze.** After that: blocker fixes, copy and sample data only. Submit by 4:15.

Cut list, in order: Nominatim verification · XLSX · bulk confirm · heat layer · handle anonymization toggle · accuracy score display.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Quota or rate limit unknown | Ask organizers now. Batch 100–200, precompute the sample, fallback mode. |
| Judges' CSV differs | Column auto-detect + preview, profile step, generic categories. Test on a second CrisisLexT6 event if time. |
| Wrong pins (Mission BC vs Calgary) | Event bounding box, outside-region flagged, precision shown. |
| Mentioned ≠ affected (Edmonton ×201) | `place_role`; map defaults to affected only. |
| Vercel timeouts | Browser-driven batches, cap at 20k rows with a clear message. |
| `.cache/` not writable on Vercel | File cache in dev only, in-memory in production, plus the precomputed sample. |

## 13. Ask the organizers at 8:30

1. Request quota per team and rate limit per minute?
2. Does `response_schema` accept an array of ~100 objects?
3. Will the judges' CSV have the same single `tweet` column? Any timestamps or labels?
4. Rubric weights — accuracy vs design vs usefulness vs business impact?
5. Any CE Strategies or MapAki brand assets we may use?
