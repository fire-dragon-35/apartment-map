"""Approximate position + SL travel time for facebook listings.

Facebook posts rarely give an address, so each listing is pinned at the centre of its stated
area (or its address, if the post gives one) via OpenStreetMap Nominatim, and the SL journey
planner gives the weekday 08:00 travel time to Karlaplan from there. Adds `lat`, `lon`, `t`
(minutes, approximate) to entries that don't have them yet. Run by .github/workflows/fb-eta.yml.
"""
import datetime, json, re, time, urllib.parse, urllib.request

KARLAPLAN = (59.3389, 18.0907)
UA = {'User-Agent': 'apartment-map (github.com/fire-dragon-35/apartment-map)'}
# Stockholm county bounding box: lon_min, lat_max, lon_max, lat_min
VIEWBOX = '17.3,60.2,19.3,58.7'


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def queries(p):
    area = (p.get('area') or '').strip()
    m = re.match(r'^(.*?)\s*\((.*?)\)\s*$', area)  # "Solna (Huvudsta)" -> "Huvudsta, Solna"
    names = [f'{m.group(2)}, {m.group(1)}', m.group(1)] if m else [area] if area else []
    out = []
    if p.get('address'):
        out += [f"{p['address']}, {n}" for n in names] or [p['address']]
    out += names
    # "Nacka centrum" -> also try "Nacka"
    out += [re.sub(r'\s+(centrum|c)$', '', n, flags=re.I) for n in names if re.search(r'\s+(centrum|c)$', n, re.I)]
    return out


def geocode(p):
    for q in queries(p):
        u = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
            {'q': q, 'format': 'json', 'limit': 10, 'countrycodes': 'se', 'viewbox': VIEWBOX, 'bounded': 1})
        time.sleep(1.1)  # nominatim usage policy: max 1 request/second
        try:
            r = get(u)
        except Exception as e:
            print('geocode failed', q, e)
            continue
        # only places/areas – not a shop or clinic that happens to share the name
        r = [x for x in r if x.get('class') in ('place', 'boundary')]
        if r:
            return round(float(r[0]['lat']), 4), round(float(r[0]['lon']), 4)
    return None


def next_weekday():
    d = datetime.date.today() + datetime.timedelta(days=1)
    while d.weekday() >= 5:
        d += datetime.timedelta(days=1)
    return d.strftime('%Y%m%d')


def sl_minutes(lat, lon):
    kl, kn = KARLAPLAN
    u = ('https://journeyplanner.integration.sl.se/v2/trips?type_origin=coord'
         f'&name_origin={lon}:{lat}:WGS84[dd.ddddd]&type_destination=coord'
         f'&name_destination={kn}:{kl}:WGS84[dd.ddddd]&calc_number_of_trips=3'
         f'&itd_date={next_weekday()}&itd_time=0800&itdTripDateTimeDepArr=arr')
    for _ in range(2):
        try:
            m = [round(j['tripDuration'] / 60) for j in get(u).get('journeys', [])]
            if m:
                return min(m)
        except Exception as e:
            print('sl failed', lat, lon, e)
    return None


def main():
    path = 'fb/listings.json'
    L = json.load(open(path, encoding='utf-8'))
    for p in L:
        if p.get('t') is not None:
            continue
        pos = geocode(p)
        if not pos:
            print('no position for', p.get('area'), p.get('url'))
            continue
        p['lat'], p['lon'] = pos
        p['t'] = sl_minutes(*pos)
        print(p.get('area'), pos, p['t'])
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(L, f, ensure_ascii=False, indent=1)
        f.write('\n')


if __name__ == '__main__':
    main()
