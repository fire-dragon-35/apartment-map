# DESIGN.md · Lägenhetskartan

Status: **locked**. Version 1.0, 23 nov 2026.

This file is the single source of truth for `index.html`. Rules use MUST and MUST NOT. Every rule has an id (`R1`, `R2` …). Rules marked ✓ are checked automatically by `tests/design_check.py`.

**Changing the design:** edit this file first, then the page, then run the check. A change is done only when the check passes.

Prose is English. Every UI string is written exactly as it appears on the page.

---

## 1. Product

One page, mobile first. It shows every rental that matches the filters, on a map and in a list sorted by travel time to Karlaplan (59.3389, 18.0907).

## 2. Hard rules

| Id | Rule |
| --- | --- |
| R1 ✓ | The map camera MUST NOT move when a listing is selected or cleared, except one pan (no zoom) when the selected pin is outside the visible map area. |
| R2 ✓ | The sheet height MUST NOT change unless the user drags it. |
| R3 ✓ | Tapping a pin MUST select the listing whose pin centre is nearest the tap, and that listing's card MUST be visible in the list afterwards. |
| R4 ✓ | Tapping a card MUST select that listing; tapping it again, tapping empty map, or pressing Esc MUST clear the selection. |
| R5 ✓ | A pin MUST show only two things: price per m² (fill) and size (diameter). No badges, dots, stripes or dashed edges. |
| R6 ✓ | Every datum MUST use the format in section 5, everywhere it appears. |
| R7 ✓ | UI text MUST NOT contain en dashes or em dashes. |
| R8 ✓ | The "nya" count MUST count only new listings that match the other filters. |
| R9 ✓ | Restid MUST be the faster of walking and SL (section 6). |
| R10 | Routes MUST be drawn only when the route toggle is on. |
| R11 | Blue (`accent`) MUST NOT appear on the map except Karlaplan. |
| R12 | Only one listing can be selected. There is no detail screen and no map callout; the card expands in place. |

## 3. Tokens

### 3.1 Colour

| Token | Value | Use |
| --- | --- | --- |
| `price.1` | #34C759 | under 250 kr/m² |
| `price.2` | #A3D63C | 250 till 299 kr/m² |
| `price.3` | #FFCC00 | 300 till 349 kr/m² |
| `price.4` | #FF9500 | 350 till 399 kr/m² |
| `price.5` | #FF3B30 | 400 kr/m² och mer |
| `price.unknown` | #AEAEB2 | no kr/m² |
| `price.text.1` to `.5` | #1E7B34, #4A7208, #7F6200, #9C4E00, #B42318 | text in the price chip |
| `text.1` | #1C1C1E | T1, warning |
| `text.2` | #3A3A3C | T2 |
| `text.3` | #6C6C70 | T3 |
| `decor` | #AEAEB2 | middle dots, chevrons |
| `accent` | #007AFF | Karlaplan, button, active toggles |
| `accent.text` | #0066D6 | links |
| `selected` | #1C1C1E | selected pin edge, selected card outline |
| `fill` | rgba(118,118,128,.14) | chips, tags, round buttons |
| `card` | #FFFFFF | card |
| `card.new` | #E8F1FD | card of a new listing |
| `sheet.bg` | rgba(242,242,247,.86) | sheet |

**Source colours** (chip text; background is the same colour at 12 %)

| Source | Colour |
| --- | --- |
| Qasa | #4B48C9 |
| Bostadsförmedlingen | #0A6F8E |
| Samtrygg | #8A3FB5 |
| HomeQ | #1F7A5C |
| Facebook | #1662C4 |
| other | #6C6C70 |

**SL line colours** (route only): tunnelbana grön #2EA84A, röd #E3242B, blå #0072BC (lines 10, 11 blå; 13, 14 röd; 17, 18, 19 grön), pendeltåg #EC619F, spårväg #F28C00, buss #E3242B, båt #00A3AD, gång #3A3A3C.

### 3.2 Type

SF Pro (system), Inter fallback, tabular figures.

| Tier | Size / weight / colour | Holds |
| --- | --- | --- |
| Title | 22 / 700 / `text.1`, tracking −0.4 | sheet title |
| T1 | 15 / 600 / `text.1` | Adress, Restid, Hyra |
| T2 | 13 / 400 / `text.2` | Storlek, Rum, Avtal, route text |
| T3 | 12 / 400 / `text.3` | Område, Ålder, legend, labels |
| Chip | 13 / 500 (price), 12 / 600 (source) | chips |

### 3.3 Space, radius, stroke

| Item | Value |
| --- | --- |
| Glass from screen edge | 12 |
| Sheet side padding | 12 |
| Card padding | 12 × 14 |
| Gap between cards | 8 |
| Gap between card lines | 5 |
| Radius: chip, tag | 6 |
| Radius: button | 12 |
| Radius: card | 16 |
| Radius: header bar, legend | 22 |
| Radius: sheet | 28 (top corners; all corners on desktop) |
| Radius: pills, round buttons | full |
| Stroke: edges and outlines | 1.5 px |
| Stroke: walk | 3 px round dots, gap 8 |
| Stroke: transit | 4 px + 7 px white casing at 90 % |

### 3.4 Glass

| Token | Recipe | Use |
| --- | --- | --- |
| `glass.chrome` | white 62 %, blur 20, saturate 180 %, 0.5 px white edge, shadow 0 8 24 at 10 % | header bar, control buttons, legend, Karlaplan label |
| `glass.sheet` | `sheet.bg`, blur 30, saturate 180 %, top shadow | sheet |

Never glass on glass.

## 4. Layout

Back to front on a phone:

1. **Map**, full screen. Esri light grey base + reference labels at 55 %.
2. **Header bar**, `glass.chrome`, top = safe area + 12.
3. **Control row**, 12 above the sheet: legend pill (left); route toggle and recenter (right), 8 apart.
4. **Sheet**, `glass.sheet`. Heights: Liten 96 px, Halv 45 % of viewport (default), Hel to 8 px under the header. Drag snaps to the nearest; a tap on the handle cycles.

Desktop (≥ 900 px): sheet is a 400 px panel, 12 from left, top and bottom. Header and control row start at 424 px.

## 5. Data formats

`␣` = non breaking space.

| Atom | Tier | Format | Examples |
| --- | --- | --- | --- |
| Adress | T1 | street; Facebook: area | Hornsgatan, Årsta |
| Område | T3 | area after the address; hidden if "Stockholm" or same as address | Södermalm |
| Restid | T1 | `N␣min`; `~N␣min` for Facebook | 23 min, ~21 min |
| Hyra | T1 | thousands with `k`, dot decimal, max one decimal | 15.2k kr, 17k kr |
| Storlek | T2 | `N␣m²` | 52 m² |
| Rum | T2 | `N␣rok`, dot decimal | 2 rok, 3.5 rok |
| Pris per m² | chip | `N␣kr/m²` with thousands space, `price.N` at 20 % behind `price.text.N` | 296 kr/m² |
| Avtal | T2 | `start → slut`; start `nu` if today or earlier, `?` if unknown; end `tills vidare` if none | nu → tills vidare |
| Datum | | `d␣mmm`, plus `␣yyyy` if not this year; months jan feb mar apr maj jun jul aug sep okt nov dec | 1 dec, 1 jan 2027 |
| Källa | chip | platform name in its source colour | Qasa |
| Ålder | T3 | `idag`, else `N␣d`; hidden if unknown | idag, 9 d |
| Notering | tag | lower case on `fill` | förstahand, studentlägenhet, möblerad |
| Varning | line | 13 px `text.1` circle with white "!" + `långt under marknadspris, kontrollera` (12 / 500 `text.1`) | |
| Unknown number | | `?` in place of the number | ? kr/m² |
| Filter value | chip | `≤␣17k␣kr`, `≥␣20␣m²`, `≥␣6␣mån`, `≤␣30␣min` | |

Between atoms: space, `·` in `decor`, space.

## 6. Travel time

```
walk  = round( haversine(listing, Karlaplan) × 1.3 / 80 )  minutes, at least 1
sl    = SL door to door, arriving 08:00 next weekday (from data)
restid = walk if sl is missing or walk ≤ sl, else sl
```

`restid` is used for display, sorting and the time filter.

## 7. Components

### 7.1 Pin (map)

Circle. Fill = price colour. Diameter = 14 + 12 × clamp((√m² − √20) / (√65 − √20), 0, 1) px. Edge 1.5 px white. Shadow 0 1 3 at 28 %.
Selected: edge `selected`, diameter + 4, on top. While a listing is selected, all other pins are at 30 % opacity.
Stacking: smaller pins above larger pins.

### 7.2 Karlaplan

15 px `accent` dot, 1.5 px white ring, 1.5 px `accent` outer ring, label `Karlaplan` in `glass.chrome`, 12 / 600.

### 7.3 Header bar

One row: four filter chips (read only, horizontal scroll if needed), then the filter button (44 px target, 32 px `fill` circle, label `Filter`).
The filter button opens, inside the bar, three sliders:

| Label | Range | Step | Default |
| --- | --- | --- | --- |
| Restid | 10 to 30 min | 1 | 30 |
| Hyra | 8k to 17k kr | 500 | 17k |
| Storlek | 20 to 60 m² | 5 | 20 |

Slider values use the filter chip format. Values are remembered in the browser.

### 7.4 Control row

| Control | Look | Action |
| --- | --- | --- |
| Legend pill | `glass.chrome`, 44 px: `<250`, five 16 × 6 bars, `400+ kr/m²` | toggles the legend |
| Route toggle | 44 px round `glass.chrome`, route icon in `text.2`; on = `accent` background, white icon | toggles routes (R10); remembered; default off |
| Recenter | 44 px round `glass.chrome`, crosshair in `accent` | flies to Karlaplan, zoom 13, centred in the visible map area |

### 7.5 Legend

`glass.chrome`, radius 22. Contents, in order: `Pris per m²` with six pins (`under 250`, `250 till 299`, `300 till 349`, `350 till 399`, `400 och mer`, `okänt`); a small and a large pin with `större = fler m²`; T3 footer `Restid med SL dörr till dörr, framme 08:00 nästa vardag`.

### 7.6 Sheet header

`{N} träffar` (Title), then the `{N} nya` toggle chip: off = `fill` + `text.1`; on = `accent` + white; on shows only new listings. Hidden when N = 0, and then the new only filter is switched off (R8).

### 7.7 Card

Whole summary is one button. Background `card`, or `card.new` when the listing is new today.

```
Hornsgatan Södermalm                        23 min
52 m² · 2 rok · [296 kr/m²]               15.2k kr
15 dec → 15 dec 2027 · [Samtrygg] · 9 d
[förstahand] [möblerad]
(!) långt under marknadspris, kontrollera
```

Line 3 order: Avtal, Källa, Ålder. Tags and warning only when present.

**Selected:** 1.5 px `selected` inset outline, and an expanded part (200 ms height animation) below a hairline:

```
gång 8 min › [T18 · 1 stopp] › [T13 · 2 stopp] › gång 5 min › Karlaplan
[ Öppna annons på Qasa ]
```

Walking: `gång N min › Karlaplan`. Line pills: 11 / 600 white on line colour, full radius; metro prefixed `T`. Button: `accent`, white T1, 44 px, radius 12, opens the ad in a new tab.

When a card is selected, the list scrolls so the card's top is 8 px under the sheet header if it came from a map tap, or if the expanded card would not fit.

### 7.8 Route (map, only with the toggle on)

| Case | Drawing |
| --- | --- |
| Walking wins | one dotted walk line, pin → Karlaplan |
| SL | dotted walk pin → first stop; each transit leg as a smoothed line in its colour with a 4 px white boarding dot at its start; dotted walk between legs; dotted walk last stop → Karlaplan |

No labels on the map. The SL walk geometry is not used.

## 8. Interaction

| Input | Result |
| --- | --- |
| Tap map | nearest pin centre within (radius + 10 px) is toggled; else selection cleared |
| Tap card | toggle that listing |
| Esc | clear |
| Drag sheet | snap to Liten, Halv or Hel |
| Tap `nya` | toggle new only; clears selection |
| Move a slider | refilter; clears selection |
| Load | fit Karlaplan and all pins once, between header and sheet, max zoom 14, zoom steps of 0.25 |

Motion: 200 ms ease out for card expand and sheet snap, 300 ms for the R1 pan, 600 ms for recenter. With reduced motion: none.

## 9. UI strings

| Key | Text |
| --- | --- |
| count | {N} träffar |
| new | {N} nya |
| contract.now | nu |
| contract.open | tills vidare |
| age.today | idag |
| age.days | {N} d |
| open | Öppna annons på {källa} |
| walk | gång {N} min |
| stops | {linje} · {N} stopp |
| warning | långt under marknadspris, kontrollera |
| empty | Inga träffar med de här filtren |
| error | Kunde inte ladda |
| aria.filter | Filter |
| aria.legend | Visa teckenförklaring |
| aria.routes | Visa resväg på kartan |
| aria.recenter | Centrera på Karlaplan |
| aria.close | Stäng |

Notes from data: `first-hand` → förstahand, `student` → studentlägenhet, `short`/`korttid` → korttid, `extension` → kan förlängas, `also listed on X` → finns även på X, queue notes hidden, Facebook furnished true/false → möblerad/omöblerad.

## 10. Data

| File | Used fields |
| --- | --- |
| apartments.geojson | coordinates, address, travel (weekday 8:00, SL), rent, size, kr/m², move in, source, link, new, flag, note |
| fb/listings.json | url, area, rent, m2, rooms, start, end, furnished, first_seen, lat, lon, t |
| routes.json | key `lat,lon` at 4 decimals → legs `[mode, line, coordinates, minutes, stops]` |

Page filters: restid ≤ slider, hyra ≤ slider, storlek ≥ slider, contract ≥ 180 days (open ended passes). New = first seen today.

## 11. Automated check

`tests/design_check.py` opens the page in a phone sized headless browser with the repo data and fails if any ✓ rule breaks:

* R1: camera centre and zoom are equal before and after selecting a card that is in view.
* R2: sheet height is equal before and after selecting.
* R3: tapping the centre of every visible pin selects that pin (or one drawn at the same spot) and its card is in view.
* R4: tap card selects, second tap clears, Esc clears.
* R5: pin elements contain no child elements and use a solid white edge.
* R6: every card matches the format patterns of section 5.
* R7: page text contains no en dash or em dash.
* R8: the `nya` number equals the number of new listings under the current filters, after changing a filter.
* R9: every listing's restid equals min(walk, sl) per section 6.

Run: `pip install playwright && playwright install chromium && python tests/design_check.py`
