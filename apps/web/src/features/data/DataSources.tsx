import { Text } from '@frame/ui';
import { useState } from 'react';
import styles from './DataSources.module.css';
import { SOURCE_INFO, shownTime, sourceName, stateOf, when, type SourceStatus, type State } from './status.ts';
import { useSources } from './useSources.ts';

const LABEL: Record<State, string> = { ok: 'Hämtades utan problem', incomplete: 'Ofullständig', old: 'Gammal' };

/** Only a successful latest run counts its ads: anything else shows 0. */
const fetchedNow = (s: SourceStatus, now: number) => (stateOf(s, now) === 'ok' ? s.kept : 0);

function Row({ s, now }: { s: SourceStatus; now: number }) {
  const state = stateOf(s, now);
  // an unfinished run has no finish time: show when it started
  const at = when(shownTime(s.source, s.finished_at ?? s.started_at), now);
  return (
    <tr data-source={s.source} data-state={state}>
      <th scope="row">
        <Text size="sm" weight="semibold">{sourceName(s.source)}</Text>
        <Text size="xs" tone="muted">{SOURCE_INFO[s.source]?.what}</Text>
      </th>
      <td>
        <span className={state === 'ok' ? styles.check : styles.cross} role="img" aria-label={LABEL[state]}>{state === 'ok' ? '✓' : '✗'}</span> {at}
        {s.error && <Text size="xs" tone="muted">Fel: {s.error}</Text>}
      </td>
      <td>{fetchedNow(s, now)}</td>
      <td>
        {s.last_complete_at
          ? <><span className={styles.check} role="img" aria-label={LABEL.ok}>✓</span> {when(shownTime(s.source, s.last_complete_at), now)}</>
          : '-'}
      </td>
      <td>{s.last_complete_kept ?? '-'}</td>
      <td>{s.total_listings ?? '-'}</td>
    </tr>
  );
}

/** DESIGN.md §4.5: the section "Stockholms data" on Om tjänsten, always visible: one table row per source. */
export function DataSources() {
  const { rows, error } = useSources();
  const [now] = useState(Date.now);
  if (error) return <section id="sources" className={styles.root}><h2>Stockholms data</h2><Text size="sm" tone="muted">Kunde inte läsa datakällornas status</Text></section>;
  if (!rows) return <section id="sources" className={styles.root}><h2>Stockholms data</h2><Text size="sm" tone="muted">Läser datakällor…</Text></section>;
  return (
    <section id="sources" className={styles.root}>
      <h2>Stockholms data</h2>
      {rows.length === 0 && <Text size="sm" tone="muted">Ingen hämtning registrerad</Text>}
      <table className={styles.table}>
        <thead><tr><th>Källa</th><th>Senast körning</th><th>Antal</th><th>Senast lyckad körning</th><th>Antal</th><th>Alla körningar</th></tr></thead>
        <tbody>
          {rows.map(s => <Row key={s.source} s={s} now={now} />)}
          <tr data-source="facebook">
            <th scope="row"><Text size="sm" weight="semibold">Facebook-grupper</Text></th>
            <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          </tr>
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <th scope="row"><Text size="sm" weight="semibold">Totalt</Text></th>
              <td>-</td>
              <td>{rows.reduce((n, r) => n + fetchedNow(r, now), 0)}</td>
              <td>-</td>
              <td>{rows.some(r => r.last_complete_kept != null) ? rows.reduce((n, r) => n + (r.last_complete_kept ?? 0), 0) : '-'}</td>
              <td>{rows.some(r => r.total_listings != null) ? rows.reduce((n, r) => n + (r.total_listings ?? 0), 0) : '-'}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </section>
  );
}
