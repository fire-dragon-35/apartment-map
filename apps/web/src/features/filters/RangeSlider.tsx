import { Text } from '@frame/ui';
import { useId, useLayoutEffect, useRef } from 'react';
import styles from './RangeSlider.module.css';

interface Props {
  idLow: string;
  idHigh: string;
  label: string;
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  /** upper limit only: one thumb, the rail filled from the left */
  single?: boolean;
  format: (low: number, high: number) => string;
  onChange: (low: number, high: number) => void;
}

/** One track, two thumbs (two stacked native range inputs, so keyboard and screen readers work). The thumbs never cross. */
export function RangeSlider({ idLow, idHigh, label, min, max, step, low, high, single, format, onChange }: Props) {
  const group = useId();
  const track = useRef<HTMLDivElement>(null);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const shown = format(low, high);
  // the filled part of the rail is two custom properties (no inline style, DESIGN.md §12)
  useLayoutEffect(() => {
    track.current?.style.setProperty('--lo', `${single ? 0 : pct(low)}%`);
    track.current?.style.setProperty('--hi', `${pct(high)}%`);
  });
  return (
    <div className={styles.row} role="group" aria-labelledby={group}>
      <Text id={group} tone="secondary">{label}</Text>
      <div className={styles.track} ref={track}>
        <input id={idLow} type="range" aria-label={`${label}, från`} tabIndex={single ? -1 : undefined} aria-valuetext={shown} min={min} max={max} step={step} value={low}
          onChange={e => onChange(Math.min(Number(e.target.value), high), high)} hidden={single} />
        <input id={idHigh} type="range" aria-label={single ? label : `${label}, till`} aria-valuetext={shown} min={min} max={max} step={step} value={high}
          onChange={e => onChange(low, Math.max(Number(e.target.value), low))} />
      </div>
      <Text as="output" weight="semibold" nowrap className={styles.value}>{shown}</Text>
    </div>
  );
}
