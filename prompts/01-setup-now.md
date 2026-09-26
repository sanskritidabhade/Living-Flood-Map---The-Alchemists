# Prompt 1: set up the project (paste right away, it runs while you read the challenges)

Paste everything below into Claude Code, inside the project folder.

---

Read CLAUDE.md and DESIGN.md. Set up the project fast. We don't know the challenge yet, so build only the foundation, no features.

- Next.js (latest, App Router, TypeScript, src/ directory), Tailwind CSS, shadcn/ui (button, card, badge, input, textarea, dialog, skeleton, tooltip, separator, sonner), lucide-react, zod. This folder already has CLAUDE.md, DESIGN.md, docs/, prompts/ and .claude/. If create-next-app refuses a non-empty folder, create the app in a temporary folder and move its files in. Keep our files as they are.
- Create .env.example and .env.local with the variables from CLAUDE.md, USE_MOCK=true. Add .cache/ and .env*.local to .gitignore.
- Create src/app/api/ai/route.ts and src/lib/ai/client.ts following the API rules in CLAUDE.md: mock mode (returns mocks/<task>.json after about 800 ms), a file cache for live calls, requests_remaining tracking, key on the server only. Leave a clear TODO where the organizers' request format goes.
- A clean base layout: header with a business name slot and a dev-only badge (MOCK, or LIVE with requests left), one main content area. All colours as CSS variables in globals.css so docs/BRAND.md can reskin it later.
- `npm run build` must pass. Commit.

Keep it minimal and fast. Reply in 5 lines when done.
