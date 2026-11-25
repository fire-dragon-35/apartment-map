import { Stack } from '@frame/core';
import { Button, ButtonLink, Checkbox, Text } from '@frame/ui';
import { CheckoutButton } from '@frame/supabase';
import { useState } from 'react';
import { ROUTES } from '../../app/useRoute.ts';
import { isDefault, MAX_PINS, type Pin } from './usePins.ts';
import styles from './PinBar.module.css';

interface Props {
  pins: Pin[];
  canEdit: boolean;
  signedIn: boolean;
  adding: boolean;
  onAdding: (on: boolean) => void;
  onRemove: (pin: Pin) => void;
  alerts: boolean;
  onSave: (alerts: boolean) => void;
  saved: boolean;
  loading: boolean;
  error: string | null;
}

/** Above the map: the pins restid is measured to, and the saved search. Everything but Karlaplan is paid (CORE.md). */
export function PinBar({ pins, canEdit, signedIn, adding, onAdding, onRemove, alerts, onSave, saved, loading, error }: Props) {
  const [upsell, setUpsell] = useState(false);

  if (!canEdit) {
    return (
      <Stack gap={2}>
        <Stack direction="row" gap={2} wrap align="center">
          <Text size="xs" tone="muted">Restid till Karlaplan.</Text>
          <Button variant="ghost" onClick={() => setUpsell(u => !u)} aria-expanded={upsell}>Egna platser och bevakning</Button>
        </Stack>
        {upsell && (
          <div className={styles.upsell}>
            <Stack gap={2}>
              <Text as="p" size="sm">Med Plus väljer du upp till {MAX_PINS} egna platser (jobb, skola, vänner), sparar din sökning och får ett mejl när något nytt passar.</Text>
              {signedIn
                ? <CheckoutButton returnPath="/#/karta">Uppgradera till Plus</CheckoutButton>
                : <ButtonLink href={ROUTES['logga-in']}>Logga in för att uppgradera</ButtonLink>}
            </Stack>
          </div>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap={2}>
      <Stack direction="row" gap={2} wrap align="center">
        {pins.map(p => (
          <span key={p.id ?? 'karlaplan'} className={styles.pin}>
            <span className={styles.dot} aria-hidden="true" />{p.label}
            {!isDefault(pins) && <button type="button" className={styles.remove} aria-label={`Ta bort ${p.label}`} onClick={() => onRemove(p)}>×</button>}
          </span>
        ))}
        {pins.length < MAX_PINS && (
          <Button variant={adding ? 'primary' : 'secondary'} onClick={() => onAdding(!adding)} aria-pressed={adding}>
            {adding ? 'Tryck på kartan…' : '+ Lägg till plats'}
          </Button>
        )}
        {loading && <Text size="xs" tone="muted" role="status">Räknar restider…</Text>}
      </Stack>
      <Text size="xs" tone="muted">Dra en plats på kartan för att flytta den. Restidsfiltret gäller alla platser.</Text>
      <Stack direction="row" gap={3} wrap align="center">
        <Button variant="secondary" onClick={() => onSave(alerts)}>{saved ? 'Uppdatera sparad sökning' : 'Spara sökning'}</Button>
        <Checkbox label="Mejla mig nya träffar varje morgon" checked={alerts} onChange={e => onSave(e.target.checked)} />
      </Stack>
      {error && <Text size="xs" tone="muted" role="alert">{error}</Text>}
    </Stack>
  );
}
