# Design rules

The look is a selling point. Judges see the app for about two minutes on a big screen, and the business owner decides in seconds whether it feels trustworthy and made for them.

## The one memorable thing
Spend boldness in one place: the moment the messy input becomes a clean draft. Show the original on one side and the structured draft on the other, with the evidence linked. Everything around it stays calm and quiet.

## Colour
- Colours come from docs/BRAND.md as CSS variables in `src/app/globals.css`. Never hard-code hex values in components.
- The brand colour is for primary actions and key highlights only. Most of the screen is neutral.
- Neutrals are tinted slightly toward the brand hue, not plain grey.
- Status colours: success green, warning amber (needs review), danger red. Always pair colour with an icon and a word, never colour alone.
- Text contrast at least 4.5:1. If the brand colour is too light for button text, use the darker button variant from BRAND.md.

## Type
- One family, chosen in BRAND.md to fit the business. Load it with `next/font/google`.
- Base size 16px. Max three text sizes on a screen. Headings are sentence case.
- Numbers in tables and totals use tabular figures (`tabular-nums`).
- Lines under 80 characters.

## Layout and spacing
- Spacing on a 4/8px scale. Generous padding around the main work area.
- Left-aligned content. One primary action per screen, placed where the eye ends.
- Desktop first for the video (1440 x 900 at 125% browser zoom), then check 390px wide.
- The key demo screen must fit without scrolling at 1440 x 900.

## Surfaces
- Vary radius by role: small for inputs and badges, medium for panels. Not the same radius on everything.
- Panels use a subtle border. Shadows only for floating layers (menus, dialogs, toasts).
- No gradient washes, no glassmorphism, no decorative blobs.

## Trust patterns (this is what the judges care about)
- AI output is labelled "Draft" until a person approves it.
- Each important field shows its confidence (icon + word) and lets you see the source text it came from.
- Fields that need review are flagged and listed in a banner at the top of the draft.
- Editing is inline and obvious. The approve button says what it does ("Approve invoice", not "Submit").
- After approval, show who approved, when, and what was changed.
- A short line near the action: "Nothing is saved until you approve."

## States (every screen has all four)
- Loading: skeleton plus plain progress words ("Reading the invoice", "Checking the totals").
- Empty: an invitation to act, with a "Try a sample" button. Judges should be able to try it in one click.
- Error: what happened and how to fix it, in the interface's voice. No apologies, no vague "Something went wrong".
- Success: a toast that repeats the action's name ("Invoice approved").

## Words
- Plain verbs, sentence case, the business's own vocabulary (see docs/RESEARCH.md).
- A button keeps the same name through the whole flow.
- Realistic sample content everywhere. Never "Lorem ipsum", "Test 123" or "John Doe".
- No hype words: revolutionary, seamless, cutting-edge, unlock, supercharge.

## Motion
- One orchestrated moment: the draft fields appear in sequence when the AI finishes. Nothing else animates on its own.
- Motion that answers a click (open, expand, confirm) is fine. Respect `prefers-reduced-motion`.

## Avoid (these make an app look AI-generated)
- Rows of identical cards with the same soft shadow.
- ALL-CAPS labels above headings, arrows added to button text, emoji used as icons.
- Purple-to-blue gradients, fade-in on every section, big stat cards by default.
- Cream background with terracotta accent, or black background with neon accent, unless the brand truly calls for it.

## Polish checklist before recording
- Business logo or wordmark in the header, favicon, page title set.
- Icons from lucide-react only, one stroke width.
- Focus rings visible, all inputs labelled.
- No console errors, no dev badges, no scrollbars on the hero screen.
- CAD currency, 13% HST where relevant, Canadian date format.
