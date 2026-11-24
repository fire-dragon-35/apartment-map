import { Stack } from '@frame/core';
import { PRICE_BANDS } from '@lk/shared';
import text from '../../app/text.module.css';
import { Dot } from '../../app/Tones.tsx';

/** DESIGN.md §4.3: one wrapping T3 line. */
export function Legend() {
  return (
    <Stack id="legend" direction="row" gap={2} wrap className={text.t3}>
      {PRICE_BANDS.map(b => <span className={text.nb} key={b.label}><Dot color={b.color} />{b.label}</span>)}
      <span>större prick = fler m²</span>
      <span>restid: SL dörr till dörr, framme 08:00 nästa vardag</span>
    </Stack>
  );
}
