import { Stack } from '@frame/core';
import { Fragment, type ReactNode } from 'react';
import { fmt, lineStyle, priceChip, SEP, sourceChip, TOKENS } from '@lk/shared';
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
 * DESIGN.md §7: the cells of the card's button and the popup, placed by class in the grid of `Details.module.css`
 * (so the order here does not matter): r1 adress · område | restid, r2 storlek · rum | hyra and kr/m², r5 tags and warning.
 */
export function Details({ l }: { l: Listing }) {
  const rum = fmt.rum(l.rooms);
  const kpm = priceChip(l.kpm);
  return (
    <>
      <span data-line="1" className={styles.name}>
        <Atom name="adress" {...T1}>{l.street}</Atom>{l.area && <> <Atom name="omrade" {...T3}>{l.area}</Atom></>}
        {l.isNew && <> <Badge tone="custom" color={TOKENS.accent} background={TOKENS.newBg} data-badge="ny">Ny</Badge></>}
      </span>
      <span data-line="1" className={styles.restid}>
        <Atom name="restid" {...T1} nowrap>{fmt.restid(l.t)}</Atom>
      </span>
      <Text data-line="2" {...T2} nowrap className={styles.size}>
        <Joined parts={[
          <Atom key="s" name="storlek" {...T2} nowrap>{fmt.storlek(l.m2)}</Atom>,
          rum ? <Atom key="u" name="rum" {...T2} nowrap>{rum}</Atom> : null,
        ]} />
      </Text>
      <Text data-line="2" nowrap className={styles.price}>
        <Atom name="hyra" size="md">{fmt.hyraTal(l.rent)}</Atom>{SEP}
        <Badge tone="custom" color={kpm.color} background={kpm.background}><span data-a="kpm">{fmt.kpm(l.kpm)}</span></Badge>
      </Text>
      {(l.tags.length > 0 || l.warn) && (
        <Stack as="span" direction="row" gap={2} wrap className={styles.tags}>
          {l.tags.map(t => <Badge key={t}>{t}</Badge>)}
          {l.warn && <Badge tone="danger">! långt under marknadspris</Badge>}
        </Stack>
      )}
    </>
  );
}

/**
 * DESIGN.md §7 line 3, full width: avtal · källa · ålder. The källa chip is the link to the original ad. The line is
 * outside the card's button (a link cannot sit inside a button), so it passes clicks through to the card, except the chip.
 */
export function Meta({ l, today }: { l: Listing; today: string }) {
  const alder = fmt.alder(l.firstSeen, today);
  const { color, background } = sourceChip(l.sourceName);
  const chip = { color, background };
  return (
    <Text data-meta data-line="3" {...T3} className={styles.meta}>
      <Joined parts={[
        <Atom key="a" name="avtal" {...T3} nowrap>{fmt.avtal(l.start, l.end, today)}</Atom>,
        l.url
          ? <a key="c" data-a="kalla" className={styles.source} style={chip} href={l.url} target="_blank" rel="noopener noreferrer">{l.sourceName}</a>
          : <span key="c" data-a="kalla" className={styles.source} style={chip}>{l.sourceName}</span>,
        alder ? <Atom key="d" name="alder" {...T3}>{alder}</Atom> : null,
      ]} />
    </Text>
  );
}

/** The card's route line, r4 full width, plain text: `gång 8 min > T18 · 1 stopp > … > Karlaplan`. Nothing when there is no route to describe. */
export function RouteLine({ l }: { l: Listing }) {
  const steps: string[] = l.byFoot
    ? [fmt.gang(l.walk)]
    : (l.legs ?? []).flatMap<string>(([mode, line, , minutes, stops]) => {
        if (mode === 'walk') return minutes ? [fmt.gang(minutes)] : [];
        return [`${lineStyle(mode, line).name}${stops ? ` · ${stops} stopp` : ''}`];
      });
  if (!steps.length) return null;
  return <Text {...T2} className={styles.route}>{[...steps, 'Karlaplan'].join(' > ')}</Text>;
}
