# apartment-map

Daily Stockholm apartment search → map at https://fire-dragon-35.github.io/apartment-map/

## How a run works

1. **Fetch (in the laptop's browser).** For each source, open its site in a tab and run the
   LOADER with javascript_tool. It downloads `scripts/lib.js` + `scripts/<source>.js` at the
   current commit and starts the job in the background (tool calls time out after ~45 s).
2. **Collect.** Run POLL in the same tab until it returns a JSON string (not `"running"`).
   Write that string, unchanged, to `results/<source>.json`.
3. **Build.** `python3 build.py` → writes `apartments.geojson` and prints the morning summary.
   "new" = not on yesterday's map. Duplicates across sources are merged.
4. Commit + push `apartments.geojson` (not `results/`).

| source | open this page | script |
|---|---|---|
| Qasa (+ Blocket) | https://qasa.com/se/sv/find-home?searchAreas=Stockholm~~se | qasa.js |
| Bostadsförmedlingen | https://bostad.stockholm.se/bostad/ | bostadsformedlingen.js |
| Samtrygg | https://www.samtrygg.se/RentalObject/NewSearch?search=stockholm | samtrygg.js |
| HomeQ (+ Slättö etc.) | https://www.homeq.se/search?selectedShapes=municipality.180 | homeq.js |

Filters live in `scripts/lib.js` (`CFG`): rent, m², travel time to Karlaplan (SL journey planner,
arrive 08:00 next weekday), latest move-in, min contract length. Change them there only.

### LOADER (replace SHA with `git rev-parse HEAD`, NAME with the script name)
```js
const B='https://raw.githubusercontent.com/fire-dragon-35/apartment-map/SHA/scripts/', g=async f=>(await fetch(B+f)).text(); (0,eval)((await g('lib.js'))+'\n'+(await g('NAME.js')))
```

### POLL
```js
for (let i = 0; i < 40 && window.__status === 'running'; i++) await new Promise(r => setTimeout(r, 1000));
window.__status === 'done' ? window.__res : window.__status
```

Not covered: Facebook groups, Bofrid (no coordinates, many duplicates), small landlords
(Wåhlin, Heimstaden, Stena, Rikshem – their Stockholm flats go via Bostadsförmedlingen or are far out).
