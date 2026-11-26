import { Text } from '@frame/ui';
import { ROUTES } from '../../app/useRoute.ts';
import css from './MapExample.module.css';

/** A handful of made-up listings: x, y, radius (size in m²) and price band 1 to 5. */
const DOTS: [number, number, number, number][] = [
  [48, 52, 6, 2], [86, 34, 8, 3], [122, 66, 5, 4], [66, 96, 7, 1], [30, 128, 6, 2],
  [292, 46, 9, 5], [318, 92, 6, 4], [206, 40, 5, 3], [312, 168, 7, 3], [276, 204, 6, 1],
  [210, 214, 8, 2], [64, 206, 5, 3], [24, 186, 7, 1], [338, 136, 5, 5],
];
const KARLAPLAN = { x: 250, y: 74 };
const PICKED = { x: 120, y: 180 };

/** App component: a static sketch of the map (no Leaflet), so the landing page shows the idea at no cost. */
export function MapExample() {
  return (
    <figure className={css.figure}>
      <a href={ROUTES.karta} className={css.link} aria-label="Öppna kartan">
        <svg viewBox="0 0 360 240" className={css.svg} role="img" aria-labelledby="map-example-title">
          <title id="map-example-title">Exempel: prickar för lägenheter, Karlaplan och en vald annons med restid</title>
          <rect width="360" height="240" className={css.land} />
          <path d="M0 140 C60 120 110 160 170 140 S280 110 360 124 V156 C290 144 240 172 170 172 S70 150 0 172 Z" className={css.water} />
          <path d="M0 82 H360 M150 0 V240 M240 0 L330 240" className={css.street} />
          <circle cx={KARLAPLAN.x} cy={KARLAPLAN.y} r="34" className={css.ring} />
          <circle cx={KARLAPLAN.x} cy={KARLAPLAN.y} r="62" className={css.ring} />
          {DOTS.map(([x, y, r, band]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className={css[`p${band}`]} />)}
          <circle cx={PICKED.x} cy={PICKED.y} r="11" className={css.picked} />
          <circle cx={PICKED.x} cy={PICKED.y} r="7" className={css.p2} />
          <circle cx={KARLAPLAN.x} cy={KARLAPLAN.y} r="7" className={css.pin} />
          <text x={KARLAPLAN.x + 12} y={KARLAPLAN.y + 4} className={css.label}>Karlaplan</text>
          <g transform="translate(138 186)">
            <rect width="206" height="46" rx="8" className={css.popup} />
            <text x="10" y="18" className={css.strong}>Hornsgatan · Södermalm</text>
            <text x="196" y="18" textAnchor="end" className={css.strong}>18 min</text>
            <text x="10" y="35" className={css.small}>54 m² · 2 rum · 13 900 · 257 kr/m²</text>
          </g>
        </svg>
      </a>
      <Text as="figcaption" size="xs" tone="muted">Varje prick är en lägenhet: färgen visar kr/m², storleken visar yta.</Text>
    </figure>
  );
}
