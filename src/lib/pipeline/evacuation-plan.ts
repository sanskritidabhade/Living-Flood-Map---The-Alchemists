import type { Route } from "@/lib/ai/schema";

/**
 * A single printable page someone can hand to a person without a smartphone.
 * Plain HTML, plain language, Canadian date format. No PDF, no spreadsheet.
 */
export function evacuationPlanHtml(route: Route, eventName: string): string {
  const printedOn = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Evacuation plan — ${route.from}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: "Source Sans 3", system-ui, sans-serif; color: #1A1A18;
         background: #fff; max-width: 40em; margin: 2rem auto; padding: 0 1.5rem;
         line-height: 1.5; }
  header { border-bottom: 2px solid #C94A1A; padding-bottom: .75rem; margin-bottom: 1.5rem; }
  .org { font-size: .85rem; color: #6B635E; letter-spacing: .02em; }
  h1 { font-size: 1.6rem; margin: .25rem 0 0; }
  .route { font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 .5rem; }
  dl { display: grid; grid-template-columns: 11rem 1fr; gap: .4rem 1rem; margin: 1.5rem 0; }
  dt { color: #6B635E; }
  dd { margin: 0; font-weight: 600; }
  .note { border-left: 3px solid #F59E0B; padding: .6rem .9rem; background: #FDF6E8;
          margin: 1.5rem 0; }
  footer { margin-top: 2.5rem; border-top: 1px solid #E5DFD8; padding-top: .75rem;
           font-size: .8rem; color: #6B635E; }
  @media print { body { margin: 0; } .noprint { display: none; } }
</style>
</head>
<body>
<header>
  <div class="org">CE Strategies · Living Flood Map</div>
  <h1>Evacuation plan</h1>
</header>

<p>This page is for people leaving <strong>${route.from}</strong> during the ${eventName}.</p>

<p class="route">${route.from} &rarr; ${route.to}</p>

<dl>
  <dt>Go to</dt><dd>${route.to} (${route.to_kind})</dd>
  <dt>Where to check in</dt><dd>${route.shelter}</dd>
  <dt>Route</dt><dd>${route.via}</dd>
  <dt>Distance</dt><dd>${route.distance_km} km</dd>
  <dt>Driving time</dt><dd>${route.drive_time}</dd>
</dl>

${route.note ? `<div class="note"><strong>Before you go:</strong> ${route.note}</div>` : ""}

<p>Take identification, medication, and warm clothes. If you cannot drive, tell the
reception centre and they will arrange transport. Do not drive through standing water.</p>

<footer>
  Printed ${printedOn}. Routes are drawn from community reports and are not an official
  evacuation order. Follow instructions from your Nation or municipality first.
</footer>

<p class="noprint"><button onclick="window.print()">Print this page</button></p>
</body>
</html>`;
}
