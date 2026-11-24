# DESIGN.md · Lägenhetskartan

Status: **locked**. Version 3.3, 24 nov 2026 (3.3: price scale green → beige → red, bands in steps of 100 from 250; popup back to plain lines. 3.2: muted price scale, pin edge in a darker shade of its fill; card as a grid with numbers in fixed columns; route line only on the selected card. 3.1: `apps/web` is composed with Frame, section 12; behaviour unchanged).

This file is the single source of truth for the page: `apps/web` (and `legacy/index.html` until it is retired). Rules use MUST and MUST NOT and have ids (`R1` …). Rules marked ✓ are checked by `apps/web/test/design.test.ts` (and, for the legacy page, `legacy/tests/design_check.py`).

**Changing the design:** edit this file first, then the page, then run the check. A change is done only when the check prints ALL PASS.

Prose is English. UI strings are written exactly as they appear on the page.

---

## 1. Principles

v3 goes back to the plain layout that felt smooth: **a normal web page** with a map at the top and a list under it. The browser does the scrolling, Leaflet does the map. Nothing floats over the map, nothing is blurred, nothing animates that the user did not ask for.

1. **Native first.** Page scroll, Leaflet markers, popups and tooltips, `<details>` for filters. No custom gestures, hit testing or overlays.
2. **Cheap to draw.** Pins are canvas circles. No `backdrop-filter`, no fixed or sticky layers.
3. **Only move what the user pointed at.** A pin tap never scrolls the page or list. A card tap brings the map to that pin.
4. **Every element earns its place.** If it carries no data or action, it goes.

## 2. Hard rules

| Id | Rule |
| --- | --- |
| R1 ✓ | The page MUST be one normal scrolling document: header, map, legend, list. No element is `position: fixed` or `sticky`, and nothing uses `backdrop-filter`. |
| R2 ✓ | Tapping a pin MUST open its popup, draw its route and outline its card, and MUST NOT scroll the page or the list. |
| R3 ✓ | Tapping a card MUST scroll the page to the top, centre the map on the pin (zoom at least 14) and open its popup. Tapping the selected card again closes it. |
| R4 ✓ | The popup's close button, a tap on empty map, and Esc MUST close the popup and clear the selection. |
| R5 ✓ | A pin MUST show only price per m² (fill) and size (radius). Selected adds a dark ring. Nothing else. |
| R6 ✓ | Every datum MUST use the format in section 5, in cards and popups. |
| R7 ✓ | UI text MUST NOT contain en dashes or em dashes. |
| R8 ✓ | The "nya" count MUST count only new listings that match the other filters. |
| R9 ✓ | Restid MUST be the faster of walking and SL (section 6). |
| R10 ✓ | With `Visa resväg` on, the selected listing's route MUST be drawn on the map while its popup is open and removed when it closes. With it off, no route is drawn. |
| R11 ✓ | Only one listing can be selected: one popup, one outlined card, one ringed pin. |
| R12 | Blue (`accent`) MUST NOT appear on the map except Karlaplan. |

## 3. Tokens

| Token | Value | Use |
| --- | --- | --- |
| `price.1` … `price.5` | #4F8A6B, #8AAE86, #C9A989, #C98068, #A8524A (muted green → beige → red) | pin fill and price dot: under 250, 250 till 349, 350 till 449, 450 till 549, 550 och mer kr/m² |
| `price.unknown` | #AEAEB2 | no kr/m² |
| `price.edge.1` … `.5` | #3B6D53, #6D9069, #AA8B6C, #A8644E, #873E37 (unknown: #8E8E93) | pin edge, a darker shade of the fill |
| `text.1` / `.2` / `.3` | #1C1C1E / #3A3A3C / #6C6C70 | primary / secondary / tertiary text |
| `line` | #E5E5EA | dividers |
| `accent` | #007AFF | Karlaplan, links |
| `new.bg` | #EEF5FF | card of a listing new today |
| `selected` | #1C1C1E | pin ring, card outline |
| `price.text.1` … `.5` | #2F5E45, #46683F, #7A5A3C, #8A4733, #7E2E28 | text in the kr/m² chip (background: the price colour at 20 %) |
| source colours | Qasa #4B48C9, Bostadsförmedlingen #0A6F8E, Samtrygg #8A3FB5, HomeQ #1F7A5C, Facebook #1662C4, other #6C6C70 | text in the source chip (background: same colour at 12 %) |

Type: system font (SF Pro / Inter), tabular figures. Title 20 / 700. T1 15 / 600 `text.1` (address, restid, hyra). T2 13 / 400 `text.2` (size, rooms, kr/m², contract, route). T3 12 / 400 `text.3` (area, source, age, legend).

SL line colours (route only): tunnelbana 10, 11 #0072BC; 13, 14 #E3242B; 17, 18, 19 #2EA84A; pendeltåg #EC619F; spårväg #F28C00; buss #E3242B; båt #00A3AD; gång #3A3A3C.

## 4. Layout (top to bottom, one column, max width 720 px)

1. **Header** (spacing from Frame, section 12): title `Lägenheter nära Karlaplan`; T3 line `{N} träffar · {N} nya · ≤ 17k kr · ≥ 20 m² · ≥ 6 mån · ≤ 30 min`; a `<details>` labelled `Filter` and, beside it, a checkbox `Visa resväg` (on by default, remembered). The details hold three sliders (Restid 10 to 30 min step 1, Hyra 8k to 17k kr step 500, Storlek 20 to 60 m² step 5; remembered in the browser) and a checkbox `Bara nya`.
2. **Map** in a flush panel, height 55 vh (min 320 px). Esri light grey base + reference labels at 55 %. Karlaplan, dashed rings at 2, 4 and 6 km, pins. Leaflet's own zoom buttons are off; pinch and double tap zoom.
3. **Legend**, one wrapping T3 line: five price dots with `<250`, `250 till 349`, `350 till 449`, `450 till 549`, `550+ kr/m²`, then `större prick = fler m²`, then `restid: SL dörr till dörr, framme 08:00 nästa vardag`.
4. **List** of cards in a flush panel, divider between cards, sorted by restid then hyra.

## 5. Data formats

`␣` = non breaking space. Between atoms: space, `·`, space.

| Atom | Format | Examples |
| --- | --- | --- |
| Adress | street; Facebook: area | Hornsgatan |
| Område | area, hidden if "Stockholm" or same as address | Södermalm |
| Restid | `N␣min`; `~N␣min` for Facebook | 23 min |
| Hyra | thousands with `k`, dot decimal, max one decimal | 15.2k kr |
| Storlek | `N␣m²` | 52 m² |
| Rum | `N␣rok` | 2 rok |
| Pris per m² | chip: `N␣kr/m²`, thousands space, in its price colours | [296 kr/m²] |
| Avtal | `start → slut`; `nu` if today or earlier, `?` if unknown; `tills vidare` if no end | nu → tills vidare |
| Datum | `d␣mmm`, `␣yyyy` if not this year | 1 dec, 1 jan 2027 |
| Källa | chip: platform name in its source colours | [Qasa] |
| Ålder | `idag` or `N␣d`; hidden if unknown | 9 d |
| Notering | lower case tag | förstahand, möblerad |
| Varning | `! långt under marknadspris, kontrollera` | |
| Unknown | `?` instead of the number | ? kr/m² |

Notes from data: `first-hand` → förstahand, `student` → studentlägenhet, `short`/`korttid` → korttid, `extension` → kan förlängas, `also listed on X` → finns även på X, queue notes hidden, Facebook furnished → möblerad / omöblerad.

## 6. Travel time

```
walk   = round( haversine(listing, Karlaplan) × 1.3 / 80 )  minutes, at least 1
sl     = SL door to door, arriving 08:00 next weekday (from data)
restid = walk if sl is missing or walk ≤ sl, else sl
```

`restid` is used for display, sorting and the time filter.

## 7. Components

**Pin** (Leaflet `circleMarker` on one canvas renderer in its own pane above rings and routes, tap tolerance 8 px; rings, route and Karlaplan are non interactive SVG): radius 6 + 6 × clamp((√m² − √20) / (√65 − √20), 0, 1); fill price colour, opacity 0.9; 1.5 px edge in its `price.edge` colour. Selected: `selected` 3 px edge, brought to front. Smaller pins drawn above larger.

**Karlaplan**: Leaflet `circleMarker`, radius 7, `accent` fill, white edge, permanent tooltip `Karlaplan`, not clickable.

**Card** (a `<button>`, full width, padding 12 16). Card and popup show the same grid, three columns (name, numbers right aligned with tabular figures, restid):

```
Hornsgatan Södermalm          15.2k kr   23 min      (T1, area T3; restid spans two rows)
52 m² · 2 rok               [296 kr/m²]              (T2)
15 dec → 15 dec 2027 · [Samtrygg] · 9 d              (T3, full width)
[förstahand]
! långt under marknadspris, kontrollera
gång 8 min › T18 · 1 stopp › T13 · 2 stopp › gång 5 min › Karlaplan   (selected card only)
```

Row 1: Adress, Område | Hyra | Restid. Row 2: Storlek, Rum | Pris per m². Line 3: Avtal, Källa, Ålder. Then tags, warning. The selected card ends with the route line: `gång N min › Karlaplan` when walking wins; line names `T` + number for metro, on their line colour.

New today: `new.bg` background. Selected: 2 px `selected` outline inside.

**Popup** (Leaflet popup, max width 280): plain lines, not the card grid: `adress område · restid`, `hyra · storlek · rum · [kr/m²]`, then line 3, tags and warning as on the card, then the link `Öppna annons på {källa} ›`. No route line.

**Route on the map** (while the popup is open and `Visa resväg` is on): each leg on its own geometry. Walk: 3 px `#3A3A3C` dots. Transit: 4 px line colour on 7 px white. Walking only: one dotted line pin → Karlaplan.

**Hover tooltip** (mouse only): `Hornsgatan · 23 min · 15.2k kr`.

## 8. Interaction

| Input | Result |
| --- | --- |
| Tap pin | select: popup, route, card outlined. No scrolling (R2). Leaflet auto pans the popup into the map. |
| Tap card | page scrolls to top; map `setView` on the pin at zoom max(current, 14); popup (R3). Tap again: close. |
| Tap empty map, popup ×, Esc | close, clear (R4) |
| Filter change | refilter, close popup, keep the map where it is |
| `Visa resväg` | draw or remove the open listing's route at once |
| Load | fit Karlaplan and all pins once, max zoom 14 |

Motion: only Leaflet's own pan and zoom animations and smooth page scroll. With reduced motion: none.

## 9. UI strings

| Key | Text |
| --- | --- |
| title | Lägenheter nära Karlaplan |
| count | {N} träffar |
| new | {N} nya |
| filter | Filter |
| only new | Bara nya |
| routes | Visa resväg |
| open | Öppna annons på {källa} › |
| walk | gång {N} min |
| stops | {linje} · {N} stopp |
| warning | långt under marknadspris, kontrollera |
| empty | Inga träffar med de här filtren |
| error | Kunde inte ladda |

## 10. Data

| File | Used fields |
| --- | --- |
| apartments.geojson | coordinates, street, area, address, t, rent_kr, m2, rooms, start, end, first_seen (older fields as fallback: travel (weekday 8:00, SL), rent, size, move in, new), kr/m², source, link, flag, note |
| fb/listings.json | url, area, rent, m2, rooms, start, end, furnished, first_seen, lat, lon, t |
| routes.json | key `lat,lon` at 4 decimals → legs `[mode, line, coordinates, minutes, stops]` |

Page filters: restid ≤ slider, hyra ≤ slider, storlek ≥ slider, contract ≥ 180 days (open ended passes). New = first seen today.

## 11. Automated check

`legacy/tests/design_check.py` opens the page in a phone sized headless browser with the repo data:

* R1: no element has computed position fixed or sticky, none uses backdrop-filter; the document is taller than the viewport and scrolls.
* R2: tapping each pin centre in view selects the pin on top there, opens a popup and outlines its card; page and list scroll positions are unchanged.
* R3: after scrolling down and tapping a card: page is at the top, the pin is inside the map, zoom ≥ 14, popup open. Tapping again closes.
* R4: popup × closes; empty map tap closes; Esc closes.
* R5: every pin's fill equals its price colour, its edge its `price.edge` colour, its radius follows section 7; only the selected pin has the dark ring.
* R6: every card and popup atom matches section 5, and card line 1 and 2 hold the atoms of section 7 in that order.
* R7: no en dash or em dash in page text.
* R8: the `nya` number equals new listings under the current filters, after changing a filter.
* R9: restid = min(walk, sl) for every listing.
* R10: with `Visa resväg` on, route layer non empty while a popup is open and empty after close; with it off, empty while open.
* R11: never more than one popup, outlined card or ringed pin.

Run: `pip install playwright && playwright install chromium && python legacy/tests/design_check.py`

The same checks run on `apps/web` with `npm test -w @lk/web`. That test finds elements by ids and data attributes, never by CSS class names (CSS Modules hash them): `#map`, `#list`, `#nya`, `#f-min`, `#f-rent`, `#f-m2`, `#f-new`, `#f-route`, `#c{id}` and `[data-card]` for cards, `aria-pressed="true"` for the selected card, `[data-new]` for a card new today, `[data-line="1"]` / `[data-line="2"]` for card lines, `[data-a]` for atoms.

## 12. Structure (Frame)

`apps/web` is built on Frame (`vendor/frame`, a git submodule pinned to one commit; never edited here). Its rules apply: `vendor/frame/AGENTS.md` and `FRAME.md`.

**Composition** (top to bottom, one column):

```
ThemeProvider (theme from section 3)
└ AppShell
  └ Container              max width 720 px (token --container-max), gutters from Frame
    └ Page
      ├ Page.Header        Header: title, meta line, Filter <details>, Visa resväg
      └ Page.Content
        ├ Panel flush      Map
        ├ Legend           Stack, row, wrap
        └ Panel flush      List (cards with dividers)
```

* **Spacing** comes from Frame's tokens (`--space-*`, `--space-gutter`); no pixel values in app CSS except the ones this file names (card padding 12 16, map height, pin and ring sizes).
* **Controls:** `Checkbox` from `@frame/ui` for `Bara nya` and `Visa resväg`; the sliders are native range inputs laid out with `Grid` (label 3, slider 6, value 3 columns).
* **Colours** from section 3 reach CSS as custom properties on `:root` (one source: `@lk/shared`). A colour that depends on data (price band, source, line) is passed to its element as a CSS custom property, the one sanctioned inline style.
* **Folders:** `src/app` (entry, theme, providers, page composition), `src/features/listings` (Listing, data hook, list, card, details), `src/features/filters` (state, header), `src/features/map` (Leaflet map, pins, popup, route). CSS Modules next to their component.
* **New shared components** go through Frame's approval rule; app components need none.
