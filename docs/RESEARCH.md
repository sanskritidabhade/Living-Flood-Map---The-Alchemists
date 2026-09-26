# Research — Living Flood Map (CE Strategies)

## CE Strategies
- Founded 2010 by Jordan Shannon (20 years working with First Nation communities, per the sponsor's own challenge writeup). Offices Thunder Bay and Winnipeg.
- Community planning, GIS and mapping, drone services, traditional knowledge studies (500+ TK interviews), training. 90+ clients across Ontario and Manitoba.

## MapAki
- Their GIS platform: web-based, view and edit community data from any device, CE Strategies handles import, password-protected, unlimited users, custom cartography, layer querying, proximity analysis.
- **No public API** — nothing on the page describes one. A GeoJSON file is the integration point.
- Emergency Mapping use case is on the page: flood risk mapping, lot plans to Next Generation 911 standards, fire risk mapping. Couchiching First Nation testimonial calls it "invaluable".

## 2013 Alberta floods
- Peak June 19–21, 2013 (event ran to July 12). Worst flooding in Alberta's history.
- **Over 100,000 displaced across southern Alberta. 75,000 of those in Calgary** — the largest evacuation order in the city's history. Five deaths.
- Damage over CA$5B; $1.7B insured made it Canada's costliest disaster until the 2016 Fort McMurray wildfire.
- Rain: Canmore 220mm in 36h; High River 325mm in under 48h.
- Rivers: Bow and Elbow ~3× their 2005 peaks. Highwood drove the High River disaster.
- Hit: High River (near-total evacuation), Canmore, Bragg Creek, 26 Calgary neighbourhoods (Bowness, Mission, Inglewood, Sunnyside/Hillhurst), Siksika Nation, Stoney Nakoda (Morley), Tsuut'ina.

## CrisisLexT6
- ~60,000 tweets, six 2012–13 events (~10k each): Hurricane Sandy, Boston Bombings, Oklahoma Tornado, West Texas Explosion, Alberta Floods, Queensland Floods.
- Columns: tweet id, text, label. **Labels are `on-topic` / `off-topic`** — use those exact words in any accuracy feature. Join on text to score precision/recall.
- 50% geo-sampled, 50% keyword-sampled.

## OCAP
- Ownership, Control, Access, Possession. First Nations data sovereignty, administered by FNIGC.
- For us: no database, uploads stay in the browser, only tweet text leaves the client, the analyst controls what is exported. Speaks to Control and Possession honestly without claiming formal compliance.

## Alberta emergency vocabulary
- **Evacuation order** = mandatory, leave now. **Evacuation alert** = prepare to leave. Never blur these.
- **Reception centre**, not "shelter".
- **State of local emergency** — declared by a municipality or nation under the Emergency Management Act.
- **AEMA** coordinates and issues Alberta Emergency Alert; municipalities and nations declare locally.
- **Overland flooding**, **berm** — standard local terms.

Sources: cestrategies.ca · cestrategies.ca/mapaki · en.wikipedia.org/wiki/2013_Alberta_floods · calgary.ca/water/flooding · github.com/sajao/CrisisLex · fnigc.ca/ocap-training · alberta.ca/evacuation
