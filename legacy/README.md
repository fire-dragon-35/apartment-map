# Legacy pipeline

Still running until the steps in ARCHITECTURE.md §16 replace it. All paths below are from the repo root.
The map is served at https://fire-dragon-35.github.io/apartment-map/legacy/ (the root page redirects there).

## How a run works

1. **Fetch (in the laptop's browser).** For each source, open its site in a tab and run the
   LOADER with javascript_tool. It downloads `legacy/scripts/lib.js` + `scripts/<source>.js` at the
   current commit and starts the job in the background (tool calls time out after ~45 s).
2. **Collect.** Run POLL in the same tab until it returns a JSON string (not `"running"`).
   Write that string, unchanged, to `legacy/results/<source>.json`.
3. **Build.** `cd legacy && python3 build.py` → writes `legacy/apartments.geojson` and prints the morning summary.
   "new" = not on yesterday's map. Duplicates across sources are merged.
4. Commit + push `legacy/apartments.geojson` (not `legacy/results/`).
5. **Facebook.** GitHub Actions (`.github/workflows/facebook.yml`, 06:30) fetches yesterday's posts
   from the public groups in `apps/worker/facebook-groups.txt` via Apify into `legacy/fb/posts.json`. Read every post's full
   `text` and update `legacy/fb/listings.json` (a JSON list) by these rules – no guessing:
   - skip posts that are someone *looking* for a home, swaps only, shared rooms, and posts already
     in the list (same `url`)
   - per offer add `{"url","group","posted","first_seen":today,"area","address","rent","m2","rooms",
     "start","end","furnished","contact","summary"}`. `rent` = monthly kr incl. fees as stated,
     `start`/`end` = YYYY-MM-DD or "now", `summary` = one short english line. Any field the post
     does not state → `null`.
   - drop offers where a *stated* value breaks `CFG` (rent > 17000, m² < 20, ends < 6 months after
     start, start after 2027-03-31, clearly outside Stockholm / far suburbs). Keep nulls.
   - drop obvious scams: central flat far below market, contact via outside site/email
     (e.g. hyrabostads.se), "landlord abroad", pay before viewing. Say how many were dropped.
   - remove entries with `first_seen` older than 14 days.
   - leave out `lat`/`lon`/`t`: after the push, `.github/workflows/fb-eta.yml` pins each new entry at
     its area's centre (Nominatim) and adds the SL travel time, shown on the map as "~N min".
   In the morning message add "facebook: N new" + one line per new offer
   (area · rent · m² · start→end · url). Commit `legacy/fb/listings.json` with the rest.

| source | open this page | script |
|---|---|---|
| Qasa (+ Blocket) | https://qasa.com/se/sv/find-home?searchAreas=Stockholm~~se | qasa.js |
| Bostadsförmedlingen | https://bostad.stockholm.se/bostad/ | bostadsformedlingen.js |
| Samtrygg | https://www.samtrygg.se/RentalObject/NewSearch?search=stockholm | samtrygg.js |
| HomeQ (+ Slättö etc.) | https://www.homeq.se/search?selectedShapes=municipality.180 | homeq.js |

Filters live in `legacy/scripts/lib.js` (`CFG`): rent, m², travel time to Karlaplan (SL journey planner,
arrive 08:00 next weekday), latest move-in, min contract length. Change them there only.

### LOADER (replace SHA with `git rev-parse HEAD`, NAME with the script name)
```js
const B='https://raw.githubusercontent.com/fire-dragon-35/apartment-map/SHA/legacy/scripts/', g=async f=>(await fetch(B+f)).text(); (0,eval)((await g('lib.js'))+'\n'+(await g('NAME.js')))
```

### POLL
```js
for (let i = 0; i < 40 && window.__status === 'running'; i++) await new Promise(r => setTimeout(r, 1000));
window.__status === 'done' ? window.__res : window.__status
```

Not covered: private Facebook groups, Bofrid (no coordinates, many duplicates), small landlords
(Wåhlin, Heimstaden, Stena, Rikshem – their Stockholm flats go via Bostadsförmedlingen or are far out).
