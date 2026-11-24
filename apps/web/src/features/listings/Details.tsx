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
 * DESIGN.md §7: one layout for the card and the popup, a grid with the numbers in fixed columns
 * (name | restid, then size · rum | hyra and kr/m² chip, then the grey meta line, tags, warning).
 */
export function Details({ l, today }: { l: Listing; today: string }) {
  const rum = fmt.rum(l.rooms), alder = fmt.alder(l.firstSeen, today);
  const kpm = priceChip(l.kpm), source = sourceChip(l.sourceName);
  const meta = <Meta l={l} today={today} alder={alder} source={source} />;
  return (
    <span className={styles.grid}>
      <span data-line="1" className={styles.row}>
        <span className={styles.name}><Atom name="adress" className={text.t1}>{l.street}</Atom>{l.area && <> <Atom name="omrade" className={text.t3}>{l.area}</Atom></>}</span>
        <Atom name="restid" className={`${text.t1} ${text.nb} ${styles.num}`}>{fmt.restid(l.t)}</Atom>
      </span>
      <span data-line="2" className={styles.row}>
        <span className={`${text.t2} ${text.nb}`}>
          <Joined parts={[
            <Atom key="s" name="storlek" className={text.nb}>{fmt.storlek(l.m2)}</Atom>,
            rum ? <Atom key="u" name="rum" className={text.nb}>{rum}</Atom> : null,
          ]} />
        </span>
        <span className={`${styles.num} ${text.nb}`}>
          <Atom name="hyra" className={text.t1}>{fmt.hyra(l.rent)}</Atom>{' '}
          <Chip fg={kpm.color} bg={kpm.background}><Atom name="kpm">{fmt.kpm(l.kpm)}</Atom></Chip>
        </span>
      </span>
      {meta}
    </span>
  );
}

/** Line 3, tags and warning: the same on the card and in the popup. */
function Meta({ l, today, alder, source }: { l: Listing; today: string; alder: string; source: { color: string; background: string } }) {
  return (
    <>
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
    </>
  );
}

/** The link to the original ad, the last line of both card and popup. */
export function SourceLink({ l }: { l: Listing }) {
  return l.url ? <a className={styles.link} href={l.url} target="_blank" rel="noopener noreferrer">Öppna annons på {l.sourceName} ›</a> : null;
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
