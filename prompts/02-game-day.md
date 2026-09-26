# Prompt 2: game day, seat A (Claude Code)

Copy one step at a time. Type @ and pick the agent from the list, or type @agent-name.
If you're behind schedule, keep the 2:00 freeze and 4:15 submit fixed and shorten the build sprints.

## Now: setup (runs while you read the challenges)
Paste prompts/01-setup-now.md.

## After the challenge is picked: plan v1
Paste the challenge word for word into docs/CHALLENGE.md first, then:
@agent-planner Draft docs/PLAN.md from docs/CHALLENGE.md and docs/RULES.md. Research and brand notes will arrive soon.

## About 20 minutes later: plan v2 and attack it
@agent-planner Update docs/PLAN.md using docs/RESEARCH.md and docs/BRAND.md. Change only what's needed.
Then:
@agent-skeptic Review docs/PLAN.md.

## Lock the plan (after you both decide)
Update docs/PLAN.md with these decisions: [paste decisions]. Keep it short. Then commit.
Then type /clear

## AI design and brand
@agent-ai-prompt-designer Design the AI call for docs/PLAN.md. Mock mode only. Use data/samples/ if it exists, otherwise make the mocks realistic.
Then:
Apply docs/BRAND.md to the colour variables in globals.css, the header name or logo, and the font. Small changes only. Commit.

## Sprint 1: the whole flow, ugly is fine
Read docs/PLAN.md and git log --oneline -8. Build slice 1: the whole demo flow end to end on mock data, using shadcn/ui components and the basics of DESIGN.md. Don't polish yet. Stop when it works, then commit.
@agent-tester Run the sprint check.
Fix blockers, commit, then type /clear

## Sprints 2 and 3: improve and polish (repeat)
Read docs/PLAN.md and git log --oneline -8. Build slice [N] from the build order. Mock mode. Stop when it works, then commit.
Take a screenshot (drag it into Claude Code), then:
@agent-designer Review this screen.
Then either fix yourself, or:
@agent-designer Apply fixes 1 to 3.
At the end of the sprint:
@agent-tester Run the sprint check.
Fix blockers, commit, then type /clear

## 12:30 Go live
Set USE_MOCK=false in .env.local (I've added the real URL and key).
@agent-ai-prompt-designer Live test allowed: run the hero sample and two messy samples through the cache. Max 5 calls. Compare with expected.json.

## 1:00 Harden
@agent-privacy-checker Review the app.
@agent-tester Full run, including the cached live results.
Fix blockers only, then commit.

## 1:45 Last changes before freeze
Apply these changes from the judge panel if each takes under 10 minutes: [paste]. Then:
@agent-designer Final polish on the main screen. Apply, styling only.
Commit.

## 2:00 Code freeze
Code freeze. Check the production build passes.
Write README.md for the judges: what it does, who it's for, how the AI is used, how privacy is handled, how to run it. Under 200 words.
If the submission asks for a link: push to a GitHub repo and import it at vercel.com (free Hobby plan). If that takes more than 15 minutes, skip it and submit the video and repo.
