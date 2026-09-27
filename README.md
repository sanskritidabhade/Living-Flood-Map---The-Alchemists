# 🌊 Living Flood Map

**Turning messy, real-time disaster reports into a trustworthy, human-verified flood map.**

Built by **Team The Alchemists** for the **Thunder Bay AI Hackathon** (Sept 26, 2026), tackling the **CE Strategies** challenge.

🔗 **Live demo:** [living-flood-map-the-alchemists.vercel.app](https://living-flood-map-the-alchemists.vercel.app)

---

## The Problem

During a flood, information arrives fast and messy — social posts, texts, and reports scattered across formats, with no shared picture of what's happening where. Responders need a single, current view of the situation, but they can't afford to wait on a slow manual sign-off process, and they can't trust an unverified AI feed either.

## What It Does

Living Flood Map ingests raw disaster reports (tweets/messages) and turns them into a live, structured map:

1. **Messy input in** — raw text reports are uploaded (CSV/XLSX supported).
2. **AI structured draft** — each report is classified and geolocated, with the evidence text and a confidence level attached to every field.
3. **Human review** — pins appear on the map as soon as they're ready. Nothing is hidden behind an approval queue, because during a flood, waiting is the harm.
4. **Correct & verify** — anyone can flag or edit a pin inline; the correction applies immediately and is attributed to them.
5. **Publish** — a single analyst click exports the verified data. Nothing leaves the tool until that export happens.

## Key Features

- 🗺️ **Live clustered map** (Leaflet) — pins cluster at zoomed-out views and separate as you zoom in.
- 🎯 **Confidence-aware pins** — solid, outlined, or dimmed styling shows how much to trust each point, with low-confidence pins tucked behind a toggle.
- 📝 **Inline correction** — every AI-labelled field shows its source evidence and can be corrected on the spot.
- 📤 **CSV/XLSX import & export** — bring in raw report data and publish a verified dataset back out.
- 🧪 **Mock & live AI modes** — develop and demo against realistic mocked AI responses, then flip to a live model call.
- 🌓 **Light/dark theme**, accessible focus states, and a UI built on shadcn/ui + Radix primitives.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router, TypeScript) |
| UI | Tailwind CSS, shadcn/ui, Radix UI, lucide-react |
| Map | Leaflet + react-leaflet, leaflet.markercluster |
| Data | PapaParse (CSV), SheetJS/xlsx (Excel), Zod (schema validation) |
| Notifications | Sonner |
| Hosting | Vercel |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/sanskritidabhade/Living-Flood-Map---The-Alchemists.git
cd Living-Flood-Map---The-Alchemists

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local   # then fill in the values below

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

| Variable | Description |
|---|---|
| `HACKATHON_API_URL` | Base URL for the AI classification API |
| `HACKATHON_API_KEY` | API key (server-side only — never exposed to the client) |
| `AI_MODEL` | Model identifier used for classification |
| `USE_MOCK` | `true` to serve canned responses from `mocks/` instead of calling the live API |

## Project Structure

```
├── src/
│   ├── app/
│   │   └── api/ai/route.ts   # the only server-side entry point that calls the AI
│   └── lib/ai/                # prompts, schema, and API client
├── mocks/                      # fake AI responses, validated against the schema
├── data/samples/                # sample test data + expected output
├── docs/                        # challenge brief, brand, research, plan
├── DESIGN.md                    # visual design rules
└── CLAUDE.md                    # project rules for AI-assisted development
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the codebase |

## Team

**The Alchemists** — built in a single day at the Thunder Bay AI Hackathon, hosted by the Northwestern Ontario Innovation Centre and XPawn.

## License

Built for hackathon submission purposes.
