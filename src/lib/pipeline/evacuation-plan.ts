import type { Profile, Route } from "@/lib/ai/schema";

export function getFallbackRoute(origin: string, _profile?: Profile | null): Route {
  const norm = origin.trim().toLowerCase();

  if (norm.includes("siksika")) {
    return {
      from: origin,
      to: "Calgary",
      to_kind: "city outside the affected area",
      distance_km: 88,
      drive_time: "about 1 hour",
      via: "Highway 1 west",
      shelter: "Enmax Centre reception centre, Calgary",
      note: "Main reception centre for Siksika evacuees. Check in at the north entrance.",
    };
  }
  if (norm.includes("high river")) {
    return {
      from: origin,
      to: "Okotoks",
      to_kind: "town outside the affected area",
      distance_km: 18,
      drive_time: "about 20 minutes",
      via: "Highway 2 north",
      shelter: "Okotoks Recreation Centre",
      note: "Highway 2 southbound is closed at High River. Leave to the north.",
    };
  }
  if (norm.includes("canmore")) {
    return {
      from: origin,
      to: "Cochrane",
      to_kind: "town outside the affected area",
      distance_km: 75,
      drive_time: "about 50 minutes",
      via: "Highway 1A east",
      shelter: "Cochrane Arena",
      note: "Highway 1 is closed in sections near Bragg Creek. Take 1A.",
    };
  }
  if (norm.includes("bowness")) {
    return {
      from: origin,
      to: "Edmonton",
      to_kind: "city well outside the affected area",
      distance_km: 300,
      drive_time: "about 3 hours",
      via: "Highway 2 north",
      shelter: "Northlands Expo Centre, Edmonton",
      note: "Use only if Calgary reception centres are full — Calgary itself is inside the affected area.",
    };
  }
  if (norm.includes("bragg creek")) {
    return {
      from: origin,
      to: "Cochrane",
      to_kind: "town outside the affected area",
      distance_km: 40,
      drive_time: "about 35 minutes",
      via: "Highway 22 north",
      shelter: "Cochrane Arena",
      note: "Highway 1 east toward Calgary is cut. Go north on 22.",
    };
  }
  if (norm.includes("tsuut'ina") || norm.includes("tsuutina")) {
    return {
      from: origin,
      to: "Okotoks",
      to_kind: "town outside the affected area",
      distance_km: 35,
      drive_time: "about 30 minutes",
      via: "Highway 22X east then Highway 2 south",
      shelter: "Okotoks Recreation Centre",
      note: "Highway 22X had a reported closure. Confirm before leaving.",
    };
  }
  if (norm.includes("morley") || norm.includes("stoney")) {
    return {
      from: origin,
      to: "Cochrane",
      to_kind: "town outside the affected area",
      distance_km: 45,
      drive_time: "about 35 minutes",
      via: "Highway 1A east",
      shelter: "Cochrane Arena",
    };
  }

  if (
    norm.includes("calgary") ||
    norm.includes("saddledome") ||
    norm.includes("downtown") ||
    norm.includes("beltline") ||
    norm.includes("inglewood") ||
    norm.includes("mission") ||
    norm.includes("sunnyside") ||
    norm.includes("chinook") ||
    norm.includes("stampede")
  ) {
    return {
      from: origin,
      to: "Okotoks",
      to_kind: "town south of the affected area",
      distance_km: 32,
      drive_time: "about 30 minutes",
      via: "Macleod Trail S / Highway 2 south",
      shelter: "Okotoks Recreation Centre",
      note: "Calgary river valleys are experiencing high water. Head south away from river basins.",
    };
  }

  return {
    from: origin,
    to: "Okotoks",
    to_kind: "reception town outside affected zone",
    distance_km: 35,
    drive_time: "about 35 minutes",
    via: "Nearest arterial highway outbound",
    shelter: "Okotoks Regional Reception Centre",
    note: "Follow local authority instructions and emergency highway signage.",
  };
}

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
