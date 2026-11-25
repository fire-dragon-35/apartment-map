# DESIGN.md · Lägenhetskartan

Status: **locked**. Version 4.1, 26 nov 2026 (4.1: one source for every restid, the travel matrix; no SL at runtime and no routes: `Visa resväg`, route text and route lines are gone, R10 dropped. 4.0: brand EnkelLGH; black and white with one indigo accent; original traffic light price colours in steps of 100; sources and tags neutral grey; warning black; Inter Tight; selected pin ring and card outline in indigo; R13. 3.9: the app gets a navbar, a footer and a landing page, section 13; the map page moves to `#/karta`, every rule in sections 1 to 11 applies to that page. 3.8: the restid slider runs 0 to 60+ min, so `no limit` adds about 11 % of the listings instead of about 80 %. 3.7: a `Datakällor` line under the list says whether the latest scrape of every site was complete and when; it opens to one block per site, section 4.5. 3.6: the sort row is one chip per key, `Restid`, `Hyra`, `Storlek`, `kr/m²`; a tap picks the key, the chosen chip again flips the direction, shown as ` ↑` / ` ↓`. 3.5: route text in row 4, tags and warning in row 5; the källa chip is the link to the ad, in line 3 with avtal and ålder; no separate link row; route text on every card and in the popup; the route is drawn on the map only for the selected listing, behind the `Visa resväg` toggle; rent shown without kr in regular weight; warning shortened; `·` between rent and kr/m². 3.4: card and popup rows fixed: r1 adress · område | restid, r2 storlek · rum | hyra and kr/m², r3 avtal · källa · ålder | `Extern länk >`, r4 tags and warning badges, r5 route in plain text (no line colours). `>` replaces every arrow in the UI. 3.3: price scale green → beige → red, bands in steps of 100 from 250; popup and card identical, both with a discreet source link. 3.2: muted price scale, pin edge in a darker shade of its fill; card as a grid with numbers in fixed columns; route line only on the selected card. 3.1: `apps/web` is composed with Frame, section 12; behaviour unchanged).

> `CORE.md` is the fixed part and wins over this file. This file is the detailed current spec: keep it true when you change the page.

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
| R2 ✓ | Tapping a pin MUST open its popup and outline its card, and MUST NOT scroll the page or the list. |
| R3 ✓ | Tapping a card MUST select it: outline the card and open its popup. It MUST NOT scroll the page or move the map (no pan, no zoom). Tapping the selected card again closes it. |
| R4 ✓ | The popup's close button, a tap on empty map, and Esc MUST close the popup and clear the selection. |
| R5 ✓ | A pin MUST show only price per m² (fill) and size (radius). Selected adds an indigo (`selected`) ring. Nothing else. |
| R6 ✓ | Every datum MUST use the format in section 5, in cards and popups. |
| R7 ✓ | UI text MUST NOT contain en dashes or em dashes. |
| R8 ✓ | The "nya" count MUST count only new listings that match the other filters. |
| R9 ✓ | Restid MUST be the travel matrix minutes to the pin (section 6), unchanged. |
| R10 | (dropped in 4.1: no routes) |
| R11 ✓ | Only one listing can be selected: one popup, one outlined card, one ringed pin. |
| R12 ✓ | The accent (indigo) MUST NOT appear on the map except Karlaplan and the selected pin's ring. |
| R13 ✓ | A selected or highlighted card's outline and background MUST follow the list's rounded corners (first and last card inherit the radius); no clipped corners. |

## 3. Tokens

| Token | Value | Use |
| --- | --- | --- |
| `price.1` … `price.5` | #34C759, #A3D63C, #FFCC00, #FF9500, #FF3B30 (traffic light) | pin fill and price dot: under 250, 250 till 349, 350 till 449, 450 till 549, 550 och mer kr/m² |
| `price.unknown` | #AEAEB2 | no kr/m² |
| `price.edge` | #FFFFFF | pin edge, every band |
| `price.text.1` … `.5` | #1E7B34, #4A7208, #7F6200, #9C4E00, #B42318 | text in the kr/m² chip (background: the price colour at 20 %) |
| `text.1` / `.2` / `.3` | #0A0A0A / #3A3A3A / #6E6E6E | primary / secondary / tertiary text |
| `line` | #EAEAEA | dividers |
| `accent` | #5B4BFF (indigo) | logo `LGH`, primary buttons, links, Karlaplan, the `ny` badge text colour family; never a data colour |
| `accent.text` | #3A2DC2 | text on `new.bg`, the `ny` badge and the `{N} nya` count |
| `new.bg` | #EEEBFF | `ny` badge background and the card of a listing new today |
| `selected` | #5B4BFF | pin ring, card outline (2 px) |
| `tag.bg` | #F0F0F2 | source chip and tag badges (text `text.2`); sources are told apart by name, never by colour |
| `warn.bg` / `warn.text` | #16161C / #FFFFFF | the warning badge (`! …`); red and orange belong to price |
| `map.bg` | #F1F1EE | map background |

**Colour jobs (never mix):** traffic light = price only; indigo = the app (brand, selection, new, actions); black = warning; grey = everything else.

**Brand:** name `EnkelLGH`; wordmark `Enkel` regular + `LGH` 800 in `accent`, letter spacing −0.02 em. No icon yet.

Type: Inter Tight (self hosted, `@fontsource-variable/inter-tight`), tabular figures. Title 20 / 700. T1 15 / 600 `text.1` (address, restid). Hyra on the card is 15 / 400 `text.1`, without `kr`. T2 13 / 400 `text.2` (size, rooms, kr/m², contract). T3 12 / 400 `text.3` (area, source, age, legend).


## 4. Layout (top to bottom, one column, max width 720 px)

1. **Header** (spacing from Frame, section 12): title `Lägenheter nära Karlaplan`; T3 line `{N} träffar · {N} nya · ≤ 30k kr · ≥ 20 m² · ≤ 30 min`; a `<details>` whose summary is a bordered button with a sliders icon, the word `Filter` and a chevron. The details open a bordered panel that floats over the page (no reflow; closes on click outside or Escape), one slider per row, all drawn the same (one rail, round thumbs, the chosen part filled), labels and values aligned, the value showing the chosen range. The end of every slider is no limit and shown with a `+`: Max restid 0 to 60+ min step 1 (one thumb, 30 by default), Max hyra 0 to 30k+ kr step 500 (one thumb), Max kr/m² 0 to 700+ step 25 (one thumb; listings without a known kr/m² always pass), Storlek 0 to 100+ m² step 5 (two thumbs), Antal rum 1 to 4+ step 0,5 (two thumbs); thumbs never cross; all remembered in the browser. A footer row holds the checkbox `Bara nya` and `Återställ`.
2. **Map** in a flush panel, height 55 vh (min 320 px). Esri light grey base + reference labels at 55 %. Karlaplan, dashed rings at 2, 4 and 6 km, pins. Leaflet's own zoom buttons are off; pinch and double tap zoom.
3. **Legend**, one wrapping T3 line: five price dots with `<250`, `250 till 349`, `350 till 449`, `450 till 549`, `550+ kr/m²`, then `större prick = fler m²`, then `restid: SL dörr till dörr, framme 08:00 nästa vardag`.
4. **List** of cards in a flush panel, divider between cards. A sort row on top: one chip per key (`Restid`, `Hyra`, `Storlek`, `kr/m²`); a tap picks the key in its natural direction (storlek largest first, the rest lowest first), a tap on the chosen chip flips it; the chosen chip shows ` ↑` or ` ↓`. Default: restid ascending, then hyra. Missing values go last. The list shows 5 cards and scrolls inside itself for the rest.
5. **Stockholms data**, a section on the `Om tjänsten` page (`#/om`, not on the map page), always visible, no dropdown. A table, one row per site: `Källa` (name and what it covers), `Hämtat` (`✓` in green and `{idag|igår|datum} {HH:MM}` when the latest fetch was complete, meaning every page was fetched without error; otherwise `Ofullständig, ...` or `Gammal, ...` (last complete fetch over 36 hours ago) with no check; the error text below when it failed), `Annonser hämtade` (the number kept). Facebook-grupper is a row saying `ingår inte ännu`. The last row is `Totalt`, the sum of `Annonser hämtade`. If the status cannot be read the section says `Kunde inte läsa datakällornas status`. Times are Stockholm time and approximate on purpose: each source's time is moved 5 to 45 minutes earlier by `shownTime` (fixed per source and fetch, never later than the real time). The data is the view `source_status` (ARCHITECTURE.md §5).

## 5. Data formats

`␣` = non breaking space. Between atoms: space, `·`, space.

| Atom | Format | Examples |
| --- | --- | --- |
| Adress | street; Facebook: area | Hornsgatan |
| Område | area, hidden if "Stockholm" or same as address | Södermalm |
| Restid | `N␣min`; `~N␣min` for Facebook | 23 min |
| Hyra | thousands with `k`, dot decimal, max one decimal; no `kr` on the card (the map tooltip keeps it), regular weight | 15.2k |
| Storlek | `N␣m²` | 52 m² |
| Rum | `N␣rok` | 2 rok |
| Pris per m² | chip: `N␣kr/m²`, thousands space, in its price colours | [296 kr/m²] |
| Avtal | `start > slut`; `nu` if today or earlier, `?` if unknown; `tills vidare` if no end | nu > tills vidare |
| Datum | `d␣mmm`, `␣yyyy` if not this year | 1 dec, 1 jan 2027 |
| Källa | chip: platform name in its source colours | [Qasa] |
| Ålder | `idag` or `N␣d`; hidden if unknown | 9 d |
| Notering | lower case tag | förstahand, möblerad |
| Varning | `! långt under marknadspris` | |
| Unknown | `?` instead of the number | ? kr/m² |

Notes from data: `first-hand` → förstahand, `student` → studentlägenhet, `short`/`korttid` → korttid, `extension` → kan förlängas, `also listed on X` → finns även på X, queue notes hidden, Facebook furnished → möblerad / omöblerad.

## 6. Travel time

```
restid = the travel matrix minutes from the listing to the pin, computed every night on the laptop:
         R5 on SL's timetable (GTFS) and OpenStreetMap, departures 07:30 to 08:00 next weekday (25th percentile),
         or walking (haversine × 1.3 / 80 m/min) when that is not slower; none over an hour of walking.
         Karlaplan is an exact destination; an own pin reads its ~460 m cell and is shown as ~N min.
```

`restid` is used for display, sorting and the time filter.

## 7. Components

**Pin** (Leaflet `circleMarker` on one canvas renderer in its own pane above the rings, tap tolerance 8 px; rings and the pin are non interactive SVG): radius 6 + 6 × clamp((√m² − √20) / (√65 − √20), 0, 1); fill price colour, opacity 0.9; 1.5 px edge in its `price.edge` colour. Selected: `selected` 2 px edge, brought to front. Smaller pins drawn above larger.

**Karlaplan**: Leaflet `circleMarker`, radius 7, `accent` fill, white edge, permanent tooltip `Karlaplan`, not clickable.

**Card** (padding 12 16; a `<button>` covers the whole card, line 3 with the source link sits on top of it). Card and popup are identical: the same grid, the same link, two columns (text left, numbers right aligned with tabular figures):

```
Hornsgatan · Södermalm                              23 min     r1: adress (T1), område (T3) | restid (T1)
52 m² · 2 rok                           15.2k · [296 kr/m²]     r2: storlek · rum (T2) | hyra (T1), chip
15 dec > 15 dec 2027 · [Samtrygg] · 9 d                        r3: full width: avtal · [källa, the link] · ålder (T3)
gång 8 min > T18 · 1 stopp > T13 · 2 stopp > gång 5 min > Karlaplan   r4: full width, plain text (every card)
[förstahand] [! långt under marknadspris]                      r5: full width: tags and warning, both badges
```

Grid: two columns (text left, numbers right aligned with tabular figures), five rows as above. Line 3 is a sibling of the button, not inside it, so the källa chip can be a link (a link cannot sit inside a button). Line 3 passes clicks through to the card, except the chip. The warning is a `danger` badge. Route line: no line colours, only the names; `>` separates the steps.

New today: `new.bg` background. Selected and keyboard focus: 2 px `selected` outline inside, round the whole card; the first and last card take the panel's corner radius so the outline is never clipped. No blue focus ring.

**Popup** (Leaflet popup, content 270 to 290 wide, room on the right for the close button): exactly the card (grid and link).

**Hover tooltip** (mouse only): `Hornsgatan · 23 min · 15.2k kr`.

## 8. Interaction

| Input | Result |
| --- | --- |
| Tap pin | select: popup, card outlined. No scrolling (R2). Leaflet auto pans the popup into the map. |
| Tap card | select: card outlined, popup; page and map do not move (R3). The popup opens without auto pan. Tap again: close. |
| Tap empty map, popup ×, Esc | close, clear (R4) |
| Filter change | refilter, close popup, keep the map where it is |
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
| walk | gång {N} min |
| stops | {linje} · {N} stopp |
| warning | långt under marknadspris |
| empty | Inga träffar med de här filtren |
| error | Kunde inte ladda |
| sources error | Kunde inte läsa datakällornas status |
| sources all ok | Alla {N} källor kompletta · senast hämtat {tid} |

## 10. Data

| File | Used fields |
| --- | --- |
| apartments.geojson | coordinates, street, area, address, t, rent_kr, m2, rooms, start, end, first_seen (older fields as fallback: travel (weekday 8:00, SL), rent, size, move in, new), kr/m², source, link, flag, note |
| fb/listings.json | url, area, rent, m2, rooms, start, end, furnished, first_seen, lat, lon, t |
| routes.json | key `lat,lon` at 4 decimals → legs `[mode, line, coordinates, minutes, stops]` |

Page filters: restid ≤ slider, hyra ≤ slider, kr/m² ≤ slider, storlek ≥ minst and ≤ högst (unless ingen gräns), rum ≥ slider, contract ≥ 180 days (open ended passes). New = first seen today.

## 11. Automated check

`legacy/tests/design_check.py` opens the page in a phone sized headless browser with the repo data:

* R1: no element has computed position fixed or sticky, none uses backdrop-filter; the document is taller than the viewport and scrolls.
* R2: tapping each pin centre in view selects the pin on top there, opens a popup and outlines its card; page and list scroll positions are unchanged.
* R3: after scrolling down and tapping a card: page scroll and map view are unchanged, the card is outlined, popup open. Tapping again closes.
* R4: popup × closes; empty map tap closes; Esc closes.
* R5: every pin's fill equals its price colour, its edge its `price.edge` colour, its radius follows section 7; only the selected pin has the dark ring.
* R6: every card and popup atom matches section 5, and card line 1 and 2 hold the atoms of section 7 in that order.
* R7: no en dash or em dash in page text.
* R8: the `nya` number equals new listings under the current filters, after changing a filter.
* R9: restid = the matrix minutes of the view for every listing.
* R11: never more than one popup, outlined card or ringed pin.

Run: `pip install playwright && playwright install chromium && python legacy/tests/design_check.py`

The same checks run on `apps/web` with `npm test -w @lk/web`. That test finds elements by ids and data attributes, never by CSS class names (CSS Modules hash them): `#map`, `#list`, `#nya`, `#f-min`, `#f-rent`, `#f-m2`, `#f-new`, `#c{id}` and `[data-card]` for cards, `aria-pressed="true"` for the selected card, `[data-new]` for a card new today, `[data-line="1"]` / `[data-line="2"]` for card lines, `[data-a]` for atoms.

## 12. Structure (Frame)

`apps/web` is built on Frame (`vendor/frame`, a git submodule pinned to one commit; never edited here). Its rules apply: `vendor/frame/AGENTS.md` and `FRAME.md`.

**Composition** (top to bottom, one column):

```
ThemeProvider (theme from section 3)
└ AppShell
  └ Container              max width 720 px (token --container-max), gutters from Frame
    └ Page
      ├ Page.Header        Header: title, meta line, Filter <details>
      └ Page.Content
        ├ Panel flush      Map
        ├ Legend           Stack, row, wrap
        ├ Panel flush      List (cards with dividers)
        └ DataSources      <details> with a T3 summary line; one block per site
```

* **Spacing** comes from Frame's tokens (`--space-*`, `--space-gutter`); no pixel values in app CSS except the ones this file names (card padding 12 16, map height, pin and ring sizes).
* **Components:** from `@frame/ui` wherever one fits (see `vendor/frame/AGENTS.md`, "Which component for what"): `Text` for every text (T1 = `size="md" weight="semibold"`, T2 = `size="sm" tone="secondary"`, T3 = `size="xs" tone="muted"`), `Badge` for the kr/m² and source chips, line pills, tags and legend dots (`tone="custom"` for data colours), `Slider` for the three filters, `Checkbox` for `Bara nya` and `Visa resväg`. The card stays an app component (a button plus the source link, which cannot sit inside a button).
* **Tokens:** section 3 values reach Frame through `app/global.css` (`--text-xs/sm/md/lg` = 12/13/15/20 px, `--color-foreground-secondary`, `--color-highlight`, `--color-selected`) and `app/theme.ts`. No inline styles in app code.
* **Folders:** `src/app` (entry, theme, providers, page composition), `src/features/listings` (Listing, data hook, list, card, details), `src/features/filters` (state, header), `src/features/map` (Leaflet map, pins, popup, route). CSS Modules next to their component.
* **New shared components** go through Frame's approval rule; app components need none.

## 13. Site frame and landing page

Built from Frame's `@frame/site` blocks (`Navbar`, `Footer`, `Hero`, `Stats`, `Steps`, `FeatureGrid`, `ChipList`, `CallToAction`) with `ButtonLink` actions; the app supplies only text, links and the `Wordmark`.

The map page of sections 1 to 11 is one page of a small site. Pages are chosen by the URL hash (`app/useRoute.ts`, no router library): `#/` landing, `#/karta` the map, `#/om` (section 4.5 data sources), `#/logga-in`, `#/skapa-konto` (placeholders that say `Den här sidan är på väg.`), anything else says `Sidan finns inte`.

* **Navbar** on every page: logo and brand `Lägenhetskartan` at the left (link to `#/`), the links `Hem`, `Karta`, `Om tjänsten` after it, `Logga in` and the accent button `Skapa konto` at the right. The current page has `aria-current="page"`. Under 768 px the links and the two account links fold into a `<details>` menu behind a three-line button. The navbar scrolls away with the page (R1 holds on every page: nothing sticky or fixed).
* **Width:** the navbar and footer are `wide` on every page so they never change shape; the footer text is centred; the map page keeps its 720 px column; the other pages use Frame's `wide` container.
* **Landing page** (filler copy until the real text exists): hero with `Öppna kartan` and `Skapa konto`, a band of four figures, `Så fungerar det` (3 steps), `Det du får` (6 features), `Annonser från` (the sources), a closing call to action.
* **Footer** on every page: brand line, three link columns (all pointing at placeholders for now), a legal line.
* **Colour:** the accent is used for the primary buttons and the hero eyebrow; R12 only concerns the map.

## 14. Own pin and saved search (paid, CORE.md)

* **One pin** restid is measured to: Karlaplan for everyone; Plus moves it to an own place ("Din plats") and back
  with `Tillbaka till Karlaplan`. No extra pins. Moving: `Flytta pinnen` turns on a placing mode (the listing dots
  are hidden, the popup closes, the cursor is a crosshair); the pin (22 px) can be dragged only in this mode; dropping it or the next tap on the map
  places it and ends the mode; `Avbryt` leaves it unchanged.
* **Pin bar** above the map. Free: "Restid till Karlaplan." and `Egna platser och bevakning`, which opens the Plus
  offer (`CheckoutButton`, or log in first). Plus: the pin's chip, `Flytta pinnen`, `Spara sökning` and
  `Mejla mig nya träffar`.
* **The pin on the map:** an indigo dot with a permanent label; draggable for Plus. The 2/4/6 km rings follow it.
* **Restid to an own place** comes from the travel matrix and shows as `~18 min`; the card's route line shows
  `Din plats ~18 min` instead of Karlaplan's route; the map draws the exact SL trip to the pin for the selected
  listing (`travel-times` with one `placeId`: slow the first time, then cached), so it can differ from `~18 min` by a few minutes.
* **Saved search:** one per user: the filters (not "Bara nya") and the pin. Opening the map without a filter query
  applies it. The email (07:45, edge function `notify-matches`) lists that morning's new matches once a day.
