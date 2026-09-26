# MASTER PROMPT: Living Flood Map (CE Strategies / MapAki)

## 1. Project & Event Overview
- **Event:** Thunder Bay AI Hackathon (Sept 26, 2026).
- **Client / Sponsor:** CE Strategies (Thunder Bay / Winnipeg GIS & mapping consultancy for First Nations communities) and their web GIS platform **MapAki**.
- **Hosts:** Northwestern Ontario Innovation Centre & XPawn (applied AI company focused on privacy-first, human-in-the-loop, auditable AI).
- **Project Name:** Living Flood Map
- **One-Line Pitch:** "AI turns thousands of messy crisis tweets into an actionable, verified disaster response map in minutes, exporting directly as an OCAP-compliant GeoJSON layer for MapAki the same day."
- **Core Value Proposition:** Rapid disaster situational awareness for emergency responders, Chief & Council, and GIS teams. Transforms unstructured social media feeds into structured GIS layers while strictly respecting First Nations **OCAP** (Ownership, Control, Access, Possession) data sovereignty principles.

## 2. Core Product & UX Philosophy
- **Human-in-the-Loop Pattern:** Messy unstructured input -> AI generates structured draft with verbatim evidence links and confidence scores -> Human analyst reviews, corrects, and approves -> Secure export released. Nothing leaves the tool or gets published without human approval.
- **Event Agnostic:** Works on any disaster dataset (floods, hurricanes, tornadoes, fires). Zero hardcoding to specific events or locations—the runtime profiling step dynamically infers event parameters and bounding boxes.
- **The "One Memorable Moment" (Split-View UX):** Split-view card on report cards showing raw, messy tweet text on the left and structured metadata on the right. Hovering over a structured field (e.g., extracted location, First Nation name, or urgent need) instantly highlights the verbatim substring match in the raw source tweet on the left.
- **Trust & Verification Rules:**
  - **Confidence Styling:** High = solid pin, Medium = outlined pin, Low = dimmed pin (hidden behind toggle).
  - **Urgency Matrix:** Visual pairing of color + icon + text label (**Critical** [pulsing red], **Urgent** [amber], **Information** [blue]).
  - **Official Claim Verification:** Claims about official status (evacuation orders, dam levels, road closures) are cross-checked against official authorities (`verified`, `contradicts`, `unverified`, `cannot_check`).
  - **Contradiction Engine:** AI identifies conflicting reports from the same geographic area (e.g., "bridge is open" vs. "bridge washed out") and flags them with a distinct warning badge for mandatory human analyst review.
  - **Publication Gate:** The single publication gate stamps `reviewed_by`, `reviewed_at`, PII masking status, and total corrections count onto exported GeoJSON/XLSX/CSV payloads.

## 3. Role-Based Views & Stakeholder Navigation
The application provides distinct, role-tailored interface modes reflecting how crisis response operates in First Nations communities:

1. **Data Analyst Mode (Verification & Cleaning):**
   - Full access to split-view tweet verification, batch classifier execution, confidence overrides, place mapping, and the Contradiction Engine review queue.
2. **Commander / Chief Mode (Executive Operations):**
   - Streamlined, high-level situational awareness view. Features the dynamic Leaflet map, automated AI Executive Brief, real-time SOS Triage alerts, infrastructure hazard toggles, and safe evacuation route controls without editing UI noise.
3. **GIS Admin Mode (Data Sovereignty & Export Gate):**
   - Focuses on dataset auditability, OCAP compliance verification, PII (Personally Identifiable Information) masking toggles, data dictionary verification, and final export generation (MapAki GeoJSON, formatted XLSX, cleaned CSV).

## 4. Key Specialized Features
- **OCAP Access Gate (Password-Protected Entry):** A login interface requiring community access keys (mocked for demo) to uphold strict First Nations data sovereignty guidelines before granting access to sensitive community crisis data.
- **AI SOS Triage (Automated Rescue Alerting):** The AI classification pipeline scans for immediate distress (e.g., trapped residents, rising water levels indoors). Detected SOS cases bypass normal queue limits, appearing as pulsing emergency beacons on the Commander's map and triggering top-level notification banners.
- **Frictionless Google Maps Evacuation Deep-Links:** In addition to calculating safe evacuation cities outside the flood bounding box, `evacuation-routes.tsx` generates pre-filled Google Maps directions URLs (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`) so commanders can instantly send turn-by-turn navigation links to evacuees.
- **Infrastructure Hazard Layer:** Categorizes and plots road washouts, downed power lines, and damaged bridges as a distinct toggleable map layer to prevent responders and evacuees from heading toward impassable routes.

## 5. Technology Stack & Key Dependencies
- **Framework:** Next.js 16 (App Router, TypeScript), React 19.
- **Styling:** Tailwind CSS v4, shadcn/ui components, Lucide React icons, Sonner (toast notifications).
- **Mapping:** Leaflet, React-Leaflet, Leaflet MarkerCluster (CARTO Positron tile basemap for keyless zero-dependency reliability; optional Mapbox GL JS toggle via `NEXT_PUBLIC_MAPBOX_TOKEN`).
- **AI Backend:** Server-side Route Handler at `/src/app/api/ai/route.ts` calling Gemini API (`HACKATHON_API_URL`, `HACKATHON_API_KEY`, model default `gemini-3-flash-preview`). Supports mock mode (`USE_MOCK=true`) and file caching (`.cache/`).
- **Data Validation & Parsing:** Zod (schema validation), PapaParse (CSV processing), SheetJS xlsx (Excel export with embedded data dictionary).

## 6. AI Pipeline Architecture (6 Server Core Tasks)
1. `profile`: Samples dataset + top hashtags to deduce `event_type`, `event_name`, `region`, `country`, bounding box `bbox [west, south, east, north]`, key places, and `what_counts_as_related`.
2. `classify`: Batches of ~100 tweets yielding structured fields:
   - `rel` (boolean relatedness) & `conf` (high/medium/low) & `why` (reasoning if low/medium).
   - `cat` (9 categories: Flooding/damage, Road/bridge closed, Evacuation/shelter, People needing help, Official warning, Power/water, Donations/volunteers, Support/sympathy, Other).
   - `urg` (critical / urgent / information).
   - `sos` (boolean distress flag for trapped individuals).
   - `eye` (eyewitness boolean) & `claim` (official claim boolean).
   - `places` (verbatim substring text, normalized name, type, role: `affected` / `help_from` / `mentioned`).
   - `fn` (First Nations community identification, e.g., Siksika Nation, Stoney Nakoda, Tsuut'ina).
   - `who`, `needs`, `src` (resident / official / media / organization / unknown).
3. `places`: Resolves extracted place names to coordinates biased strongly by the profiled bounding box, assigning precision metrics and `inside_region` flags.
4. `brief`: Analyzes filtered datasets on demand to produce executive situation briefs highlighting critical counts, infrastructure damage, and cited report IDs.
5. `verify`: Evaluates official status claims and detects contradictions between opposing tweets in the same geographic region.
6. `fallback`: Pure client/server heuristic keyword scorer activated automatically if API rate limits or network failures occur, ensuring zero demo downtime ("Local Triage Mode").

## 7. Bonus Objective: Global Multi-Disaster Filtering
- **Context:** Capability to process a multi-disaster CSV containing tweets from all over the world covering various disaster types[cite: 1], extracting and mapping only flood-related occurrences across multiple countries[cite: 1].
- **Start Screen Trigger:** Add a "Global Mixed Dataset Mode" dropzone toggle on `start-screen.tsx`.
- **Global Map Display (`map-view.tsx`):** When processing a global dataset, default the map view to an interactive world map (zoom level ~2, center `[20, 0]`) rather than locking to a local regional bounding box[cite: 1].
- **Interactive Global Clustering:** Utilize Leaflet MarkerCluster to automatically cluster points by continent/country, allowing smooth click-to-zoom exploration into specific international flood zones[cite: 1].
- **AI Filtering Strategy:** The `classify` pipeline strictly identifies and filters out non-flood disasters (e.g., fires, earthquakes, tornadoes)[cite: 1], setting them as `rel: false`, or categorizes them normally while defaulting the frontend filter to isolate flood-related activity[cite: 1].

## 8. Application Screens & Components
1. **OCAP Access Gate & Start Screen (`start-screen.tsx`):** Password-protected gate leading to CSV dropzone, "Try Alberta 2013 Sample" button, "Global Mixed Dataset" toggle[cite: 1], and auto-column mapping detector.
2. **Event Brief Review (`event-brief-card.tsx`):** Editable panel allowing analysts to verify AI-profiled event boundaries and keywords before initiating bulk processing.
3. **Sorting Screen (`sorting-screen.tsx`):** Real-time chunked batch sorter displaying streaming progress, live categorizations, and pins populating the map in real time.
4. **Explorer View (`explorer.tsx`):**
   - **Left Panel (60%):** Dynamic Leaflet map (`map-view.tsx`) with clustered urgency markers, SOS beacons, infrastructure hazard overlays, and role switchers.
   - **Right Panel (40%):**
     - *Tab 1 - Reports:* Urgency/category/FN filter bar + Report Feed (`report-card.tsx`) featuring hover-to-highlight split-view card UX.
     - *Tab 2 - Situation Brief:* Executive AI situation summary (`situation-brief.tsx`).
     - *Tab 3 - Evacuation Routes:* Safe route calculations (`evacuation-routes.tsx`) with direct pre-filled Google Maps directions links.
     - *Tab 4 - SOS Alerts:* Dedicated feed for emergency rescue flags.
5. **Verified Dataset View (`dataset-table.tsx`):** Sortable table + Analyst Publish & Export gate (`export.ts`) generating MapAki-compliant GeoJSON, Excel spreadsheets with data dictionaries, and sanitized CSVs.

## 9. Repository & Code Directory Structure
```text
docs/                  # Specification & domain docs (CHALLENGE, PLAN, RESEARCH, BRAND, DESIGN)
src/app/api/ai/route.ts# Server-side AI endpoint route handler (Gemini API integration)
src/app/globals.css    # Theme variables & design system styling
src/app/page.tsx       # Main app state controller & multi-screen/role navigation
src/components/        # UI components
  ├── map-view.tsx
  ├── report-card.tsx
  ├── event-brief-card.tsx
  ├── situation-brief.tsx
  ├── evacuation-routes.tsx
  ├── dataset-table.tsx
  ├── explorer.tsx
  ├── sorting-screen.tsx
  ├── start-screen.tsx
  └── filter-bar.tsx
src/lib/ai/            # prompts.ts, schema.ts (Zod schemas), client.ts (Gemini HTTP client + caching)
src/lib/pipeline/      # batch.ts, clean.ts, export.ts, fallback.ts, ingest.ts, reports.ts
mocks/                 # Precomputed schema-valid mock JSON responses
data/samples/          # Sample CSV datasets (2013 Alberta Floods, Global Multi-Disaster)