import { Stack } from '@frame/core';
import { Fragment, type ReactNode } from 'react';
import { fmt, lineStyle, priceChip, SEP, sourceChip } from '@lk/shared';
import text from '../../app/text.module.css';
import { Chip, Pill } from '../../app/Tones.tsx';
import type { Listing } from './Listing.ts';
import styles from './Details.module.css';

/** One datum of DESIGN.md §5; `data-a` names it for the page rules test. */
const Atom = ({ name, className, children }: { name: string; className?: string; children: ReactNode }) =>
  <span data-a={name} className={className}>{children}</span>;

/** Atoms separated by ` · `; empty ones are left out. */
const Joined = ({ parts }: { parts: (ReactNode | null)[] }) =>
  <>{parts.filter(Boolean).map((p, i) => <Fragment key={i}>{i > 0 && SEP}{p}</Fragment>)}</>;

/** DESIGN.md §7: the same lines in the same order on the card and in the popup. */
export function Details({ l, today }: { l: Listing; today: string }) {
  const rum = fmt.rum(l.rooms), alder = fmt.alder(l.firstSeen, today);
  const kpm = priceChip(l.kpm), source = sourceChip(l.sourceName);
  return (
    <>
      <span data-line="1">
        <Joined parts={[
          <Fragment key="p"><Atom name="adress" className={text.t1}>{l.street}</Atom>{l.area && <> <Atom name="omrade" className={text.t3}>{l.area}</Atom></>}</Fragment>,
          <Atom key="r" name="restid" className={`${text.t1} ${text.nb}`}>{fmt.restid(l.t)}</Atom>,
        ]} />
      </span>
      <span data-line="2" className={text.t2}>
        <Joined parts={[
          <Atom key="h" name="hyra" className={`${text.t1} ${text.nb}`}>{fmt.hyra(l.rent)}</Atom>,
          <Atom key="s" name="storlek" className={text.nb}>{fmt.storlek(l.m2)}</Atom>,
          rum ? <Atom key="u" name="rum" className={text.nb}>{rum}</Atom> : null,
          <Chip key="k" fg={kpm.color} bg={kpm.background}><Atom name="kpm">{fmt.kpm(l.kpm)}</Atom></Chip>,
        ]} />
      </span>
      <span data-line="3" className={text.t3}>
        <Joined parts={[
          <Atom key="a" name="avtal" className={text.nb}>{fmt.avtal(l.start, l.end, today)}</Atom>,
          <Chip key="c" fg={source.color} bg={source.background}><Atom name="kalla">{l.sourceName}</Atom></Chip>,
          alder ? <Atom key="d" name="alder">{alder}</Atom> : null,
        ]} />
      </span>
      {l.tags.length > 0 && (
        <Stack as="span" direction="row" gap={2} wrap>
          {l.tags.map(t => <span className={styles.tag} key={t}>{t}</span>)}
        </Stack>
      )}
      {l.warn && <span className={styles.warn}>! långt under marknadspris, kontrollera</span>}
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
        return [<Fragment key={i}><Pill color={color}>{name}</Pill>{stops ? ` · ${stops} stopp` : ''}</Fragment>];
      });
  if (!steps.length) return null;
  return <span className={text.t2}>{[...steps, 'Karlaplan'].map((s, i) => <Fragment key={i}>{i > 0 && ' › '}{s}</Fragment>)}</span>;
}
