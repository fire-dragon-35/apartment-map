import { Stack } from '@frame/core';
import { Fragment, type ReactNode } from 'react';
import { fmt, lineStyle, priceChip, SEP, sourceChip } from '@lk/shared';
import { Badge, Text, type TextProps } from '@frame/ui';
import type { Listing } from './Listing.ts';
import styles from './Details.module.css';

/** One datum of DESIGN.md §5; `data-a` names it for the page rules test. */
const Atom = ({ name, ...text }: { name: string } & TextProps) => <Text data-a={name} {...text} />;

/** DESIGN.md §3 type steps: T1 15/600, T2 13 secondary, T3 12 muted. */
const T1 = { size: 'md', weight: 'semibold' } as const;
const T2 = { size: 'sm', tone: 'secondary' } as const;
const T3 = { size: 'xs', tone: 'muted' } as const;

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
        <span className={styles.name}><Atom name="adress" {...T1}>{l.street}</Atom>{l.area && <> <Atom name="omrade" {...T3}>{l.area}</Atom></>}</span>
        <Atom name="restid" {...T1} nowrap className={styles.num}>{fmt.restid(l.t)}</Atom>
      </span>
      <span data-line="2" className={styles.row}>
        <Text {...T2} nowrap>
          <Joined parts={[
            <Atom key="s" name="storlek" {...T2} nowrap>{fmt.storlek(l.m2)}</Atom>,
            rum ? <Atom key="u" name="rum" {...T2} nowrap>{rum}</Atom> : null,
          ]} />
        </Text>
        <Text nowrap className={styles.num}>
          <Atom name="hyra" {...T1}>{fmt.hyra(l.rent)}</Atom>{' '}
          <Badge tone="custom" color={kpm.color} background={kpm.background}><span data-a="kpm">{fmt.kpm(l.kpm)}</span></Badge>
        </Text>
      </span>
      {meta}
    </span>
  );
}

/** Line 3, tags and warning: the same on the card and in the popup. */
function Meta({ l, today, alder, source }: { l: Listing; today: string; alder: string; source: { color: string; background: string } }) {
  return (
    <>
      <Text data-line="3" {...T3} className={styles.full}>
        <Joined parts={[
          <Atom key="a" name="avtal" {...T3} nowrap>{fmt.avtal(l.start, l.end, today)}</Atom>,
          <Badge key="c" tone="custom" color={source.color} background={source.background}><span data-a="kalla">{l.sourceName}</span></Badge>,
          alder ? <Atom key="d" name="alder" {...T3}>{alder}</Atom> : null,
        ]} />
      </Text>
      {l.tags.length > 0 && (
        <Stack as="span" direction="row" gap={2} wrap className={styles.full}>
          {l.tags.map(t => <Badge key={t}>{t}</Badge>)}
        </Stack>
      )}
      {l.warn && <Text size="xs" weight="semibold" className={styles.full}>! långt under marknadspris, kontrollera</Text>}
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
        return [<Fragment key={i}><Badge tone="custom" shape="pill" color="#fff" background={color}>{name}</Badge>{stops ? ` · ${stops} stopp` : ''}</Fragment>];
      });
  if (!steps.length) return null;
  return <Text {...T2}>{[...steps, 'Karlaplan'].map((s, i) => <Fragment key={i}>{i > 0 && ' › '}{s}</Fragment>)}</Text>;
}
