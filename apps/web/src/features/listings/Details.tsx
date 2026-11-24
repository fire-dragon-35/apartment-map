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

/**
 * DESIGN.md §7: the same grid on the card and in the popup. Numbers sit in fixed columns so cards compare top to bottom:
 * name | hyra | restid, then size · rum | kr/m² chip, then the grey meta line.
 */
export function Details({ l, today }: { l: Listing; today: string }) {
  const rum = fmt.rum(l.rooms), alder = fmt.alder(l.firstSeen, today);
  const kpm = priceChip(l.kpm), source = sourceChip(l.sourceName);
  return (
    <span className={styles.grid}>
      <span data-line="1" className={styles.row}>
        <span className={styles.name}><Atom name="adress" className={text.t1}>{l.street}</Atom>{l.area && <> <Atom name="omrade" className={text.t3}>{l.area}</Atom></>}</span>
        <Atom name="hyra" className={`${text.t1} ${text.nb} ${styles.num}`}>{fmt.hyra(l.rent)}</Atom>
        <Atom name="restid" className={`${text.t1} ${text.nb} ${styles.num} ${styles.time}`}>{fmt.restid(l.t)}</Atom>
      </span>
      <span data-line="2" className={styles.row}>
        <span className={text.t2}>
          <Joined parts={[
            <Atom key="s" name="storlek" className={text.nb}>{fmt.storlek(l.m2)}</Atom>,
            rum ? <Atom key="u" name="rum" className={text.nb}>{rum}</Atom> : null,
          ]} />
        </span>
        <span className={styles.chip}><Chip fg={kpm.color} bg={kpm.background}><Atom name="kpm">{fmt.kpm(l.kpm)}</Atom></Chip></span>
      </span>
      <span data-line="3" className={`${text.t3} ${styles.full}`}>
        <Joined parts={[
          <Atom key="a" name="avtal" className={text.nb}>{fmt.avtal(l.start, l.end, today)}</Atom>,
          <Chip key="c" fg={source.color} bg={source.background}><Atom name="kalla">{l.sourceName}</Atom></Chip>,
          alder ? <Atom key="d" name="alder">{alder}</Atom> : null,
        ]} />
      </span>
      {l.tags.length > 0 && (
        <Stack as="span" direction="row" gap={2} wrap className={styles.full}>
          {l.tags.map(t => <span className={styles.tag} key={t}>{t}</span>)}
        </Stack>
      )}
      {l.warn && <span className={`${styles.warn} ${styles.full}`}>! långt under marknadspris, kontrollera</span>}
    </span>
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
