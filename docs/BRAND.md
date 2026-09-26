# Brand — CE Strategies, Living Flood Map

## Name
**CE Strategies** (founded 2010, Thunder Bay and Winnipeg). Their software arm, **MapAki**, provides mapping and data tools for community planning and emergency response.

Tagline: **"For the North, from the North"** — emphasizes regional authenticity and community-centred values.

## Logo
**Direct link:** https://www.cestrategies.ca/wp-content/themes/ces/img/logo.svg

**Description:** Clean, minimalist SVG wordmark reading "CE Strategies" in professional sans-serif. Use this in the app header at 48px height. Maintain clear space around it.

## Colours

### Primary Palette
- **Primary (action, highlight):** `#C94A1A` — warm orange-red from their brand.
- **Secondary (supporting):** `#1A3A5C` — deep teal, used for secondary interactive elements.
- **Background:** `#F5F0E8` — warm, slightly cream-tinted off-white for reduced glare.

### Urgency Pin Colours
Always pair colour with icon and word per DESIGN.md — colour alone conveys nothing.

- **Critical (danger red, immediate rescue/infrastructure):** 
  - Fill: `#DC2626` (standard red)
  - Stroke/border: `#991B1B` (darker red for contrast against light basemap)
  
- **Urgent (warning amber, evacuation/closure):**
  - Fill: `#F59E0B` (standard amber)
  - Stroke/border: `#B45309` (darker amber for contrast)
  
- **Information (info blue, updates/donations):**
  - Fill: `#3B82F6` (standard blue)
  - Stroke/border: `#1E40AF` (darker blue for contrast)

### Confidence Styling (composes with urgency colour)
**High confidence:** Solid fill at 100% opacity, 2px solid stroke in darker shade.
**Medium confidence:** Stroke only (outline), 2.5px stroke in brand colour, 20% fill opacity white inside.
**Low confidence:** 50% fill opacity, 2px stroke dashed, hidden behind "Show low-confidence reports" toggle.

### Neutrals (tinted toward warm brand hue, not pure grey)
- **Background:** `#F5F0E8` (the brand's warm off-white — this is the page background)
- **Surface (panels, cards):** `#FFFCF7` (slightly warm white, sits above the background)
- **Foreground (text):** `#1A1A18` (near-black, warm)
- **Muted (secondary text):** `#6B635E` (taupe, warm-tinted — 5.18:1 on the background)
- **Border:** `#E5DFD8` (light warm border, for panels and inputs)

### Status Colours (fixed, do not deviate)
- **Success (published, verified):** `#166534` (green — darkened so white text clears AA; see note below)
- **Warning (needs review, unverified):** `#F59E0B` (amber — always takes **black** text, never white)
- **Danger (error, contradicts):** `#DC2626` (red)
- **Info (neutral info):** `#3B82F6` (blue)

Text-on-background variants, when a status needs to be written as coloured text rather than a filled chip: danger `#991B1B` (7.33:1), amber `#B45309` (4.43:1 — borderline, pair with an icon or use at 16px+ semibold), info `#1E40AF` (7.69:1), success `#166534` (6.29:1).

---

## Tone of Voice

**Three words:** Trustworthy, authoritative, calm.

### Voice Guidelines
This is emergency infrastructure for First Nations communities during crisis. No hype, no enthusiasm, no "exciting" language. Assume the person using it is under stress.

**Phrases to use:**
- "Data stays in your browser. Nothing is shared."
- "AI-generated — not verified. The map shows concentration, not spread."
- "Nothing leaves the tool until you publish."
- "Community report — not verified."

**Phrases to avoid:**
- "Unlock," "supercharge," "revolutionize," "seamless" (hype words)
- "Oops!" or "Sorry!" (no casual apologies in an emergency)
- "Cutting-edge AI" (irrelevant; focus on the map, not the technology)
- "We've made it super easy" (condescending tone)

---

## Visual Feel
**In one line:** Infrastructure-focused, civic-minded, designed for crisis response — calm authority, no decorative flourishes.

Inspiration: Government mapping tools, utility dashboards. Serious, clear, fast. The map does the talking; UI stays out of the way.

---

## Font

**Chosen font:** **Source Sans 3** (Google Fonts).

**Why:** Professional and readable at small sizes, warm personality matches CE Strategies' community-focused tone, excellent for both UI labels and body text. Neutral enough not to distract during an emergency.

**Import snippet** (add to `src/app/layout.tsx` or `globals.css`):
```javascript
import { Source_Sans_3 } from "next/font/google";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
```

**Usage in globals.css:**
```css
body {
  font-family: var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
}
```

**Font weights in use:**
- 400 (regular): body text, labels
- 500 (medium): secondary headings, badge text
- 600 (semibold): primary headings, button text, field labels
- 700 (bold): critical headings only (rarely used)

---

## Tokens — CSS Custom Properties

Add this `:root` block to `src/app/globals.css`. Format is HSL, compatible with Tailwind 4 and modern shadcn/ui. Use `var(--primary)` in component styles; never hardcode hex.

Every HSL value below was converted from its hex and checked. The hex in each comment is the authority — if you change one, recompute the other.

**No dark mode.** The demo is recorded in light mode at 1440 × 900, and a half-tested dark palette is a liability in front of judges. The warm off-white background is the brand. If the build finishes early, dark mode can be added then — not before.

```css
:root {
  /* Brand primary */
  --primary: 16 77% 45%;            /* #C94A1A — orange-red */
  --primary-hover: 16 78% 36%;      /* #A63B14 */
  --primary-foreground: 0 0% 100%;  /* white text on primary */

  /* Secondary and supporting */
  --secondary: 211 56% 23%;         /* #1A3A5C — dark teal */
  --secondary-foreground: 0 0% 100%;

  /* Accent (highlights, secondary interactive) */
  --accent: 211 56% 23%;            /* same as secondary for this app */
  --accent-foreground: 0 0% 100%;

  /* Ring (focus states) */
  --ring: 16 77% 45%;               /* matches primary */

  /* Neutral backgrounds — warm-tinted, not grey */
  --background: 37 39% 94%;         /* #F5F0E8 — brand warm off-white */
  --foreground: 60 4% 10%;          /* #1A1A18 — near-black warm */

  /* Panels, cards, elevated surfaces */
  --surface: 38 100% 98%;           /* #FFFCF7 */

  /* Secondary text */
  --muted: 23 6% 39%;               /* #6B635E — taupe */
  --muted-foreground: 23 6% 39%;    /* muted text colour, same value */

  /* Borders, dividers */
  --border: 32 20% 87%;             /* #E5DFD8 */

  /* Status colours */
  --success: 143 64% 24%;           /* #166534 — green */
  --success-foreground: 0 0% 100%;  /* white */

  --warning: 38 92% 50%;            /* #F59E0B — amber */
  --warning-foreground: 0 0% 0%;    /* black text on amber, never white */

  --danger: 0 72% 51%;              /* #DC2626 — red */
  --danger-foreground: 0 0% 100%;

  --info: 217 91% 60%;              /* #3B82F6 — blue */
  --info-foreground: 0 0% 100%;

  /* Status as coloured text on the background */
  --success-text: 143 64% 24%;      /* #166534 */
  --warning-text: 26 90% 37%;       /* #B45309 */
  --danger-text: 0 70% 35%;         /* #991B1B */
  --info-text: 226 71% 40%;         /* #1E40AF */

  /* Pin strokes */
  --pin-critical-stroke: 0 70% 35%;  /* #991B1B */
  --pin-urgent-stroke: 26 90% 37%;   /* #B45309 */
  --pin-info-stroke: 226 71% 40%;    /* #1E40AF */

  /* Radius tokens */
  --radius-sm: 4px;   /* inputs, badges */
  --radius-md: 8px;   /* panels, cards */
  --radius-lg: 12px;  /* dialogs */
}
```

---

## Button Variants

### Primary Button
Used for main actions: "Publish export," "Confirm event and sort tweets," "Try a sample."

**Background:** `#C94A1A` (primary orange-red)
**Text:** `#FFFFFF` (white)
**Border:** None
**Hover:** `#A63B14` (darker orange-red, ~20% darker)

**Contrast check:** white on `#C94A1A` = **4.69:1** ✓ (AA 4.5:1 — passes, but with little margin, so do not lighten the orange). Hover `#A63B14` = 6.45:1 ✓.

### Ghost Button
Used for secondary actions: filters, toggles, "Show low-confidence reports."

**Background:** transparent
**Text:** `#1A3A5C` (secondary dark teal)
**Border:** 1px solid `#E5DFD8` (light border)
**Hover:** `#EDE6DA` (a step darker than the background, since the page is already `#F5F0E8`)

**Contrast check:** teal on the background `#F5F0E8` = **10.26:1** ✓. On surface white = 11.64:1 ✓.

### Destructive Button
Used for dangerous actions: "Delete report," "Clear all data."

**Background:** `#DC2626` (danger red, standard)
**Text:** `#FFFFFF` (white)
**Border:** None
**Hover:** `#991B1B` (darker red)

**Contrast check:** white on `#DC2626` = **4.83:1** ✓. Hover `#991B1B` = 8.31:1 ✓.

---

## Accessibility Notes

### Measured Contrast Ratios

All values computed from the hex pairs, not estimated.

| Pairing | Ratio | Standard | Status |
|---------|-------|----------|--------|
| Body text `#1A1A18` on surface `#FFFCF7` | 17.03:1 | AAA 7:1 | ✓ Pass |
| Body text `#1A1A18` on background `#F5F0E8` | 15.36:1 | AAA 7:1 | ✓ Pass |
| Secondary teal `#1A3A5C` on background | 10.26:1 | AAA 7:1 | ✓ Pass |
| White on secondary `#1A3A5C` | 11.64:1 | AAA 7:1 | ✓ Pass |
| Black on amber `#F59E0B` | 9.78:1 | AAA 7:1 | ✓ Pass |
| White on destructive hover `#991B1B` | 8.31:1 | AAA 7:1 | ✓ Pass |
| White on success `#166534` | 7.13:1 | AAA 7:1 | ✓ Pass |
| Muted text `#6B635E` on background | 5.18:1 | AA 4.5:1 | ✓ Pass |
| White on danger `#DC2626` | 4.83:1 | AA 4.5:1 | ✓ Pass |
| White on primary `#C94A1A` | 4.69:1 | AA 4.5:1 | ✓ Pass (thin margin) |
| Amber text `#B45309` on background | 4.43:1 | AA 4.5:1 | ✗ **Fails by 0.07** |

**The two to watch:**
- **White on primary `#C94A1A` passes at 4.69:1 with almost no margin.** Do not lighten the orange, do not use it behind text smaller than 16px, and do not use white-on-orange for body copy — buttons and chips only.
- **Amber text on the background fails AA at 4.43:1.** Never write warning status as amber text on the page. Use the filled chip instead (black on `#F59E0B`, 9.78:1), or `#B45309` at 16px+ semibold, where AA's large-text threshold of 3:1 applies.
- White on plain amber `#F59E0B` is **1.94:1** and must never be used.

### Colour Dependency
- **Pins:** Always paired with icon (danger/warning/info) and word label. Do not rely on colour alone.
- **Status badges:** Verified/unverified/contradicts badges include icon + text, not just colour.
- **Text emphasis:** Use font weight (600+) or icon alongside colour for critical information.

### Dark Mode
Not shipped. The demo is recorded in light mode at 1440 × 900 and the warm off-white is the brand. See the note above the token block.

---

## Implementation Checklist

- [ ] Copy `:root` CSS variables to `src/app/globals.css`
- [ ] Import Source Sans 3 in `src/app/layout.tsx`
- [ ] Set favicon to CE Strategies logo
- [ ] Add CE Strategies wordmark to app header (48px)
- [ ] Test all button variants in light mode for contrast
- [ ] Verify urgency pins read on CARTO Positron basemap (light grey)
- [ ] Check report card highlighted text (place names) stands out
- [ ] Confirm focus rings use `--ring` variable (matches primary)
- [ ] No console errors, no hardcoded hex values in components

---

**Last updated:** 2026-09-26  
**For:** Living Flood Map (Thunder Bay AI Hackathon)  
**Brand ownership:** CE Strategies Inc.
