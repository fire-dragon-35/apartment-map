#!/usr/bin/env python3
"""Router for the travel time matrix (ARCHITECTURE.md section 8, phase 1.5). Run by the worker as a subprocess.

  matrix.py hash  --gtfs sl.zip
      prints the timetable hash: names, sizes and CRCs of the feed's files except feed_info.txt (read from the zip
      directory, nothing is unpacked), so a re-published identical feed has the same hash.

  matrix.py build --gtfs sl.zip --osm stockholm.osm.pbf --origins o.json --cells c.json --date YYYY-MM-DD
                     --out m.i16 [--percentile 50]
      origins: [{"lat", "lon"}, ...]   cells: [{"lat", "lon"}, ...]   (positions in the order of the output)
      out: little endian int16, origins x cells, row major: transit minutes at the given percentile (default the
      median) over the departures 07:30 to 08:00,
      -1 where R5 finds no trip. Walk and the rest of DESIGN.md section 6 are applied by the worker, not here.

Needs Java 21 (JAVA_HOME) and r5py; see setup.sh. Progress goes to stderr.
"""
import argparse
import hashlib
import json
import sys
import time
import zipfile


def gtfs_hash(path: str) -> str:
    h = hashlib.sha256()
    with zipfile.ZipFile(path) as z:
        for info in sorted(z.infolist(), key=lambda i: i.filename):
            if info.filename != 'feed_info.txt':
                h.update(f'{info.filename}\t{info.file_size}\t{info.CRC}\n'.encode())
    return h.hexdigest()[:32]


def build(a: argparse.Namespace) -> None:
    sys.argv.extend(['--max-memory', a.max_memory])  # r5py reads its JVM options from argv; before the import
    from datetime import datetime, timedelta

    import geopandas
    import numpy
    import r5py

    def points(file: str) -> 'geopandas.GeoDataFrame':
        rows = json.load(open(file, encoding='utf-8'))
        return geopandas.GeoDataFrame(
            {'id': range(len(rows))},
            geometry=geopandas.points_from_xy([r['lon'] for r in rows], [r['lat'] for r in rows]),
            crs='EPSG:4326',
        )

    origins, cells = points(a.origins), points(a.cells)
    t0 = time.time()
    network = r5py.TransportNetwork(a.osm, [a.gtfs])
    print(f'network built in {time.time() - t0:.0f} s', file=sys.stderr, flush=True)

    t0 = time.time()
    ttm = r5py.TravelTimeMatrix(
        network,
        origins=origins,
        destinations=cells,
        snap_to_network=True,
        departure=datetime.fromisoformat(f'{a.date}T07:30:00'),
        departure_time_window=timedelta(minutes=30),
        percentiles=[a.percentile],
        transport_modes=[r5py.TransportMode.TRANSIT, r5py.TransportMode.WALK],
        max_time=timedelta(minutes=120),
    )
    print(f'{len(origins)} origins x {len(cells)} cells routed in {time.time() - t0:.0f} s', file=sys.stderr, flush=True)

    column = 'travel_time' if 'travel_time' in ttm.columns else f'travel_time_p{a.percentile:02d}'
    out = numpy.full((len(origins), len(cells)), -1, dtype='<i2')
    found = ttm.dropna(subset=[column])
    out[found['from_id'].to_numpy(), found['to_id'].to_numpy()] = numpy.rint(found[column].to_numpy()).astype('<i2')
    out.tofile(a.out)
    print(f'{len(found)} of {out.size} pairs have a trip', file=sys.stderr, flush=True)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='command', required=True)
    h = sub.add_parser('hash')
    h.add_argument('--gtfs', required=True)
    b = sub.add_parser('build')
    for name in ('gtfs', 'osm', 'origins', 'cells', 'date', 'out'):
        b.add_argument(f'--{name}', required=True)
    b.add_argument('--max-memory', default='3G')
    b.add_argument('--percentile', type=int, default=50)
    a = p.parse_args()
    if a.command == 'hash':
        print(gtfs_hash(a.gtfs))
    else:
        build(a)


if __name__ == '__main__':
    main()
