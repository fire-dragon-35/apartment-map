import { Text } from '@frame/ui';
import { useState } from 'react';
import styles from './DataSources.module.css';
import { SOURCE_INFO, shownTime, sourceName, stateOf, when, type SourceStatus, type State } from './status.ts';
import { useSources } from './useSources.ts';

const LABEL: Record<State, string> = { ok: 'Komplett', incomplete: 'Ofullständig', old: 'Gammal' };

function Row({ s, now }: { s: SourceStatus; now: number }) {
  const state = stateOf(s, now);
  const at = s.finished_at ? when(shownTime(s.source, s.finished_at), now) : 'pågår';
  return (
    <tr data-source={s.source} data-state={state}>
      <th scope="row">
        <Text size="sm" weight="semibold">{sourceName(s.source)}</Text>
        <Text size="xs" tone="muted">{SOURCE_INFO[s.source]?.what}</Text>
      </th>
      <td>
        {state === 'ok' ? <span className={styles.check} aria-label="Hämtades utan problem">✓ </span> : `${LABEL[state]}, `}
        {at}
        {s.error && <Text size="xs" tone="muted">Fel: {s.error}</Text>}
      </td>
      <td>{s.kept}</td>
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
        <thead><tr><th>Källa</th><th>Hämtat</th><th>Annonser hämtade</th></tr></thead>
        <tbody>
          {rows.map(s => <Row key={s.source} s={s} now={now} />)}
          <tr data-source="facebook">
            <th scope="row"><Text size="sm" weight="semibold">Facebook-grupper</Text></th>
            <td colSpan={2}>ingår inte ännu</td>
          </tr>
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <th scope="row"><Text size="sm" weight="semibold">Totalt</Text></th>
              <td />
              <td>{rows.reduce((n, r) => n + r.kept, 0)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </section>
  );
}
