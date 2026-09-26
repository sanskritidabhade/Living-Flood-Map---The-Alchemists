# Project rules (read every session)

## Context
- Thunder Bay AI Hackathon, Saturday Sept 26, 2026. Challenges arrive 8:00 AM. Submission closes 4:30 PM; we submit by 4:15.
- Every challenge comes from a real local Thunder Bay business. We submit a working web app and a short demo video. Winning videos are screened at the awards.
- Hosts: Northwestern Ontario Innovation Centre (helps local businesses adopt AI) and XPawn (Thunder Bay applied AI company: document automation, human review of every AI output, privacy-first, auditable).
- Team of two. This Claude Code session runs on one Claude Pro plan with limited usage. Be brief.

## Source of truth
- The business problem: docs/CHALLENGE.md (pasted word for word).
- What we build: docs/PLAN.md. If a request conflicts with PLAN.md, say so before building.
- Organizer rules and rubric, if given: docs/RULES.md.

## Our default app pattern (use it unless the challenge clearly needs something else)
Messy input in, AI makes a structured draft with evidence and confidence, a person reviews, edits and approves. Nothing is saved, sent or acted on without human approval.

## Stack
Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, lucide-react, zod, sonner. Deployed on Vercel's free plan.
Commands: `npm run dev`, `npm run build`, `npm run lint`.

## Where things live
- `src/lib/ai/` prompts.ts, schema.ts, client.ts
- `src/app/api/ai/route.ts` the only place the AI is called (server side)
- `mocks/` fake AI responses, valid against the schema
- `data/samples/` fictional test data plus `expected.json`
- `docs/` CHALLENGE, RULES, RESEARCH, BRAND, PLAN, AI, DEMO_SCRIPT
- `DESIGN.md` visual rules. Follow it for every screen.

## AI API rules (hackathon credits are limited)
- `.env.local` holds HACKATHON_API_URL, HACKATHON_API_KEY, AI_MODEL (default gemini-3-flash-preview), USE_MOCK (default true).
- Follow the organizers' API docs for the request format. Use their `response_schema` option for structured JSON. Never invent parameters.
- USE_MOCK=true: return the matching file from `mocks/` after about 800 ms so loading states are visible.
- Live mode: every call goes through the file cache in `.cache/` (key = hash of task + input). One call per user action. Never call in loops, on page load, or in tests unless a human says "live test allowed".
- Read `requests_remaining` from each response. Show a small dev-only badge (MOCK, or LIVE with requests left). Hide it in production.
- The key stays on the server. Never NEXT_PUBLIC_, never in client code, never committed.

## Build rules
- First make the whole demo flow work end to end on mocks. Ugly and working beats pretty and broken until 12:30.
- We build the app directly today, no template. Use shadcn/ui components before writing custom ones. Keep components simple.
- Small steps. After each working step: `git add -A && git commit -m "<what works now>"`. Commits are our undo button.
- Never run `git reset --hard`, `git clean`, `rm -rf` or other destructive commands without asking.
- Ask before adding a dependency or doing a big refactor.
- 2:00 PM code freeze. After that: blocker fixes, copy and sample data only.

## Agents (.claude/agents/)
planner, skeptic, ai-prompt-designer, designer, tester, privacy-checker usually run here.
researcher, brand-stylist, business-owner, sample-data-maker, judge-panel, demo-director usually run in free chat apps, and can run here as a backup.
Only run an agent when a human asks for it. Don't spawn subagents on your own.

## Saving usage
- Keep replies short. Don't repeat file contents back. Summarize, don't narrate.
- Read only the files the task needs.
- After each sprint the humans run /clear. To catch up, read docs/PLAN.md and `git log --oneline -8`.
