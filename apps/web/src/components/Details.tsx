import { Fragment, type ReactNode } from 'react';
import { fmt, lineStyle, priceChip, SEP, sourceChip } from '@lk/shared';
import type { Listing } from '../domain/Listing.ts';

const Atom = ({ name, className, children }: { name: string; className?: string; children: ReactNode }) =>
  <span data-a={name} className={className}>{children}</span>;

const Chip = ({ style, children }: { style: { background: string; color: string }; children: ReactNode }) =>
  <span className="chip" style={style}>{children}</span>;

/** Atoms separated by ` · `; empty ones are left out. */
const Joined = ({ parts }: { parts: (ReactNode | null)[] }) =>
  <>{parts.filter(Boolean).map((p, i) => <Fragment key={i}>{i > 0 && SEP}{p}</Fragment>)}</>;

/** DESIGN.md §7: the same lines in the same order on the card and in the popup. */
export function Details({ l, today }: { l: Listing; today: string }) {
  const rum = fmt.rum(l.rooms), alder = fmt.alder(l.firstSeen, today);
  return (
    <>
      <span className="l1">
        <Joined parts={[
          <Fragment key="p"><Atom name="adress" className="t1">{l.street}</Atom>{l.area && <> <Atom name="omrade" className="t3">{l.area}</Atom></>}</Fragment>,
          <Atom key="r" name="restid" className="t1 nb">{fmt.restid(l.t)}</Atom>,
        ]} />
      </span>
      <span className="l2 t2">
        <Joined parts={[
          <Atom key="h" name="hyra" className="t1 nb">{fmt.hyra(l.rent)}</Atom>,
          <Atom key="s" name="storlek" className="nb">{fmt.storlek(l.m2)}</Atom>,
          rum ? <Atom key="u" name="rum" className="nb">{rum}</Atom> : null,
          <Chip key="k" style={priceChip(l.kpm)}><Atom name="kpm">{fmt.kpm(l.kpm)}</Atom></Chip>,
        ]} />
      </span>
      <span className="t3">
        <Joined parts={[
          <Atom key="a" name="avtal" className="nb">{fmt.avtal(l.start, l.end, today)}</Atom>,
          <Chip key="c" style={sourceChip(l.sourceName)}><Atom name="kalla">{l.sourceName}</Atom></Chip>,
          alder ? <Atom key="d" name="alder">{alder}</Atom> : null,
        ]} />
      </span>
      {l.tags.length > 0 && <span className="tags">{l.tags.map(t => <span className="tag" key={t}>{t}</span>)}</span>}
      {l.warn && <span className="warn">! långt under marknadspris, kontrollera</span>}
    </>
  );
}

/** The card's last line: `gång 8 min › T18 · 1 stopp › … › Karlaplan`. Nothing when there is no route to describe. */
export function RouteLine({ l }: { l: Listing }) {
  const steps: ReactNode[] = l.byFoot
    ? [fmt.gang(l.walk)]
    : (l.legs ?? []).flatMap<ReactNode>(([mode, line, , minutes, stops], i) => {
        if (mode === 'walk') return minutes ? [fmt.gang(minutes)] : [];
        const { name, color } = lineStyle(mode, line);
        return [<Fragment key={i}><span className="pill" style={{ background: color }}>{name}</span>{stops ? ` · ${stops} stopp` : ''}</Fragment>];
      });
  if (!steps.length) return null;
  return <span className="route t2">{[...steps, 'Karlaplan'].map((s, i) => <Fragment key={i}>{i > 0 && ' › '}{s}</Fragment>)}</span>;
}
