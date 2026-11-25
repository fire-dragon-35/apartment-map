import { Stack } from '@frame/core';
import { Badge, Text } from '@frame/ui';
import { PRICE_BANDS } from '@lk/shared';
import { useState } from 'react';
import styles from './DataSources.module.css';
import { isLow, problems, SOURCE_INFO, sourceName, stateOf, when, type SourceStatus, type State } from './status.ts';
import { useSources } from './useSources.ts';

const GOOD: string = PRICE_BANDS[0]!.color, WARN: string = PRICE_BANDS[2]!.color, BAD: string = PRICE_BANDS.at(-1)!.color;
const LABEL: Record<State, string> = { ok: 'Komplett', incomplete: 'Ofullständig', old: 'Gammal' };
const COLOR: Record<State, string> = { ok: GOOD, incomplete: BAD, old: WARN };

function Row({ s, now }: { s: SourceStatus; now: number }) {
  const state = stateOf(s, now);
  const usual = s.usual_runs >= 3 && s.usual_kept !== null ? `, vanligt ${s.usual_kept}` : '';
  return (
    <li className={styles.source} data-source={s.source} data-state={state}>
      <Stack direction="row" gap={1} align="center">
        <Badge tone="custom" shape="dot" background={COLOR[state]} />
        <Text size="sm" weight="semibold">{sourceName(s.source)}</Text>
        <Text size="xs" tone="muted">{LABEL[state]}</Text>
      </Stack>
      <Text size="xs" tone="muted">{SOURCE_INFO[s.source]?.what}</Text>
      <dl className={styles.facts}>
        <dt>Hämtat</dt><dd>{s.finished_at ? when(s.finished_at, now) : 'pågår'}</dd>
        <dt>Senast komplett</dt><dd>{s.last_complete_at ? when(s.last_complete_at, now) : 'aldrig'}</dd>
        <dt>Sidor</dt><dd>{s.pages ?? '?'}</dd>
        <dt>Annonser</dt><dd>{s.fetched} hämtade → {s.kept} behållna{isLow(s) ? ' (få)' : ''}{usual}</dd>
        <dt>Bortvalda</dt><dd>{s.skipped} medvetet (delat rum, seniorboende), {s.invalid} ogiltiga</dd>
        <dt>På sidan nu</dt><dd>{s.active}</dd>
      </dl>
      {s.error && <Text size="xs" tone="muted">Fel: {s.error}</Text>}
    </li>
  );
}

/** DESIGN.md §4.4: one line that says whether the scrape can be trusted; the detail per source behind it. */
export function DataSources() {
  const { rows, error } = useSources();
  const [now] = useState(Date.now);
  let summary = 'Läser datakällor…';
  let color: string = WARN;
  if (error) { summary = 'Kunde inte läsa datakällornas status'; color = BAD; }
  else if (rows) {
    const bad = problems(rows, now);
    const latest = rows.map(r => r.finished_at).filter((t): t is string => t !== null).sort().at(-1);
    summary = rows.length === 0 ? 'Ingen hämtning registrerad' : bad.length
      ? `${bad.join(', ')}${latest ? ` · senast hämtat ${when(latest, now)}` : ''}`
      : `Alla ${rows.length} källor kompletta · senast hämtat ${latest ? when(latest, now) : '?'}`;
    color = rows.length === 0 ? BAD : bad.length ? WARN : GOOD;
  }
  return (
    <details id="sources" className={styles.details}>
      <summary className={styles.summary}>
        <Stack as="span" direction="row" gap={1} align="center">
          <Badge tone="custom" shape="dot" background={color} />
          <Text size="xs" tone="muted">{summary}</Text>
        </Stack>
      </summary>
      {rows && (
        <ul className={styles.list}>
          {rows.map(s => <Row key={s.source} s={s} now={now} />)}
          <li className={styles.source} data-source="facebook">
            <Text size="sm" weight="semibold">Facebook-grupper</Text>
            <Text size="xs" tone="muted">ingår inte ännu</Text>
          </li>
          <Text size="xs" tone="muted">
            Komplett = alla sidor hämtades utan fel. Det säger inte att sajten visade allt: räkna med att några annonser kan saknas.
          </Text>
        </ul>
      )}
    </details>
  );
}
