"""SL route (fastest of 3 journeys, weekday arrive 08:00) from every listing to Karlaplan.

Writes routes.json: {"lat,lon": [[mode, line, [[lat,lon],...], minutes, stops], ...]} for the map to draw on tap.
mode: 'walk' | 'metro' | 'train' | 'tram' | 'bus' | 'boat' | 'other'. Already-known points are kept,
points no longer listed are dropped. Run by .github/workflows/routes.yml.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from fb_eta import get, next_weekday, KARLAPLAN

MODES = {1: 'train', 2: 'metro', 4: 'tram', 5: 'bus', 9: 'boat', 99: 'walk', 100: 'walk'}


def key(lat, lon):
    return f'{float(lat):.4f},{float(lon):.4f}'


def thin(c, n=60):
    c = [[round(a, 5), round(b, 5)] for a, b in c]
    c = [p for i, p in enumerate(c) if i == 0 or p != c[i - 1]]
    if len(c) <= n:
        return c
    step = (len(c) - 1) / (n - 1)
    return [c[round(i * step)] for i in range(n)]


def route(lat, lon):
    kl, kn = KARLAPLAN
    u = ('https://journeyplanner.integration.sl.se/v2/trips?type_origin=coord'
         f'&name_origin={lon}:{lat}:WGS84[dd.ddddd]&type_destination=coord'
         f'&name_destination={kn}:{kl}:WGS84[dd.ddddd]&calc_number_of_trips=3'
         f'&itd_date={next_weekday()}&itd_time=0800&itdTripDateTimeDepArr=arr')
    for _ in range(2):
        try:
            js = get(u).get('journeys', [])
            if not js:
                continue
            j = min(js, key=lambda x: x['tripDuration'])
            out = []
            for l in j['legs']:
                tr = l.get('transportation') or {}
                mode = MODES.get((tr.get('product') or {}).get('class'), 'other')
                c = l.get('coords') or [l['origin']['coord'], l['destination']['coord']]
                if len(c) < 2:
                    continue
                mins = round((l.get('duration') or 0) / 60)
                stops = max(len(l.get('stopSequence') or []) - 1, 0) if mode != 'walk' else 0
                if out and out[-1][0] == 'walk' and mode == 'walk':
                    out[-1][2] += thin(c)
                    out[-1][3] += mins
                else:
                    out.append([mode, tr.get('disassembledName') or '', thin(c), mins, stops])
            return out
        except Exception as e:
            print('sl failed', lat, lon, e)
    return None


def main():
    pts = set()
    g = json.load(open('apartments.geojson', encoding='utf-8'))
    for f in g['features']:
        if f['geometry']['type'] == 'Point':
            lon, lat = f['geometry']['coordinates'][:2]
            pts.add(key(lat, lon))
    if os.path.exists('fb/listings.json'):
        for p in json.load(open('fb/listings.json', encoding='utf-8')):
            if p.get('lat') and p.get('lon'):
                pts.add(key(p['lat'], p['lon']))
    old = json.load(open('routes.json', encoding='utf-8')) if os.path.exists('routes.json') else {}
    # entries from before minutes/stops were stored are fetched again
    new = {k: old[k] for k in pts if k in old and all(len(l) >= 5 for l in old[k])}
    for k in sorted(pts - new.keys()):
        r = route(*k.split(','))
        if r:
            new[k] = r
    print(f'{len(new)} routes ({len(pts - old.keys())} new)')
    with open('routes.json', 'w', encoding='utf-8') as f:
        json.dump(new, f, separators=(',', ':'))


if __name__ == '__main__':
    main()
