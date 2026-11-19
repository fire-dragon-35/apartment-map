#!/usr/bin/env python3
"""Merge results/*.json (one per source, written by the daily task from scripts/*.js)
into apartments.geojson and print the morning summary. Deterministic: same input -> same output.

"new" = listing id not present in the previous apartments.geojson (so it really means
"not on the map yesterday"), not a guess from publish dates.
"""
import json, glob, os, sys

MAP_URL = "https://fire-dragon-35.github.io/apartment-map/"
SECOND_HAND = {"Qasa", "Samtrygg"}

PREFIX = {
    "Qasa": lambda m: f"https://qasa.com/se/sv/home/{m['id']}",
    "Bostadsförmedlingen": lambda m: f"https://bostad.stockholm.se/bostad/{m['u']}/",
    "Samtrygg": lambda m: f"https://www.samtrygg.se/{m['u']}",
    "HomeQ": lambda m: f"https://www.homeq.se{m['u']}",
}

def link(src, m):
    u = m.get("u") or ""
    if u.startswith("http"):
        return u
    return PREFIX[src](m) if src in PREFIX else u

def load_prev_ids():
    try:
        g = json.load(open("apartments.geojson"))
        return {f["properties"].get("id") for f in g["features"] if f["properties"].get("id")}
    except Exception:
        return set()

def main():
    files = sorted(glob.glob("results/*.json"))
    if not files:
        sys.exit("no results/*.json")
    prev = load_prev_ids()
    runs, rows = [], []
    for fn in files:
        r = json.load(open(fn))
        if isinstance(r, str):          # tolerate a JSON string that wraps the object
            r = json.loads(r)
        runs.append(r)
        if "rows" in r:
            r["matches"] = [dict(zip(r["cols"], row)) for row in r["rows"]]
        for m in r["matches"]:
            m["u"] = link(r["source"], m)
            m["src"] = r["source"]
            m["key"] = f'{r["source"]}:{m["id"]}'
            rows.append(m)

    # duplicates: same place (≈10 m) and size within 2 m², across or within sources
    rows.sort(key=lambda m: (m["t"], m["r"], m["key"]))
    kept, groups = [], {}
    for m in rows:
        g = (round(m["la"], 4), round(m["lo"], 4))
        dup = next((k for k in groups.get(g, []) if abs((k["m"] or 0) - (m["m"] or 0)) <= 2), None)
        if dup:
            if dup["r"] != m["r"]:
                note = f'also listed on {m["src"]} for {m["r"]} kr'
                dup["f"] = "; ".join(x for x in [dup["f"], note] if x)
            continue
        groups.setdefault(g, []).append(m)
        kept.append(m)

    feats = []
    for m in kept:
        kpm = round(m["r"] / m["m"]) if m["m"] else None
        flags = [m["f"]] if m["f"] else []
        if kpm and kpm < 200 and m["src"] in SECOND_HAND and "first-hand" not in m["f"]:
            flags.append("kr/m² far below second-hand market – verify")
        m["new"] = m["key"] not in prev
        m["kpm"] = kpm
        m["flag"] = "; ".join(flags)
        st = m["st"] or "see ad"
        en = m["en"] or "indefinite"
        rooms = m["k"]
        rooms_s = (str(int(rooms)) if rooms and float(rooms).is_integer() else str(rooms)) if rooms else "?"
        feats.append({"type": "Feature",
            "geometry": {"type": "Point", "coordinates": [m["lo"], m["la"]]},
            "properties": {
                "id": m["key"],
                "address": f'{m["a"]}, {m["ar"]}'.strip(", "),
                "travel (weekday 8:00, SL)": f'{m["t"]} min',
                "rent": f'{m["r"]} kr',
                "size": f'{rooms_s} rok, {m["m"]} m²',
                "kr/m²": kpm,
                "move in": f"{st} → {en}",
                "source": m["src"],
                "link": m["u"],
                "new": "yes" if m["new"] else "",
                "flag": m["flag"],
            }})

    json.dump({"type": "FeatureCollection", "features": feats}, open("apartments.geojson", "w"),
              ensure_ascii=False, indent=0)

    # summary for the morning message
    new = [m for m in kept if m["new"]]
    def mi(m):
        a = "move-in in ad" if not m["st"] else ("available now" if m["st"] == "now" else f'from {m["st"]}')
        return f'{a}, {"no end date" if not m["en"] else "until " + m["en"]}'
    out = [MAP_URL, f"{len(new)} new · {len(kept)} total on the map"]
    for m in new[:10]:
        line = f'{m["t"]} min · {m["a"]}, {m["ar"]} · {m["k"] or "?"} rok · {m["m"]} m² · {m["r"]} kr · {m["kpm"]} kr/m² · {mi(m)} · {m["src"]} · {m["u"]}'
        if m["flag"]:
            line += f' · ⚠ {m["flag"]}'
        out.append(line)
    if len(new) > 10:
        out.append(f"+{len(new) - 10} more new on the map")
    out.append("coverage: " + ", ".join(f'{r["source"].lower()} {r["total"]} read' + (f' ({r["skipped"]} shared/senior removed)' if r.get("skipped") else '') for r in runs))
    print("\n".join(out))

if __name__ == "__main__":
    main()
