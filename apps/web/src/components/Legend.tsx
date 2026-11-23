import { PRICE_BANDS } from '@lk/shared';

export function Legend() {
  return (
    <p className="legend t3" id="legend">
      {PRICE_BANDS.map(b => <span className="nb" key={b.label}><i className="dot" style={{ background: b.color }} />{b.label}</span>)}
      <span>större prick = fler m²</span>
      <span>restid: SL dörr till dörr, framme 08:00 nästa vardag</span>
    </p>
  );
}
