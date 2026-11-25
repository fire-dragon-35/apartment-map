import { Stack } from '@frame/core';
import { Button, ButtonLink, Checkbox, Text } from '@frame/ui';
import { CheckoutButton } from '@frame/supabase';
import { useState } from 'react';
import { ROUTES } from '../../app/useRoute.ts';
import { isDefault, type Pin } from './usePins.ts';
import styles from './PinBar.module.css';

interface Props {
  pins: Pin[];
  canEdit: boolean;
  signedIn: boolean;
  onReset: () => void;
  alerts: boolean;
  onSave: (alerts: boolean) => void;
  saved: boolean;
  loading: boolean;
  error: string | null;
}

/** Above the map: the pins restid is measured to, and the saved search. Everything but Karlaplan is paid (CORE.md). */
export function PinBar({ pins, canEdit, signedIn, onReset, alerts, onSave, saved, loading, error }: Props) {
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
              <Text as="p" size="sm">Med Plus flyttar du pinnen från Karlaplan till din egen plats (jobb, skola), sparar din sökning och får ett mejl när något nytt passar.</Text>
              {signedIn
                ? <CheckoutButton returnPath="/#/karta">Uppgradera till Plus</CheckoutButton>
                : <ButtonLink href={ROUTES['logga-in']}>Logga in för att uppgradera</ButtonLink>}
            </Stack>
          </div>
        )}
      </Stack>
    );
  }

  const pin = pins[0]!;
  return (
    <Stack gap={2}>
      <Stack direction="row" gap={2} wrap align="center">
        <span className={styles.pin}><span className={styles.dot} aria-hidden="true" />{pin.label}</span>
        <Text size="xs" tone="muted">Dra pinnen på kartan för att mäta restid dit.</Text>
        {!isDefault(pins) && <Button variant="ghost" onClick={onReset}>Tillbaka till Karlaplan</Button>}
        {loading && <Text size="xs" tone="muted" role="status">Räknar restider…</Text>}
      </Stack>
      <Stack direction="row" gap={3} wrap align="center">
        <Button variant="secondary" onClick={() => onSave(alerts)}>{saved ? 'Uppdatera sparad sökning' : 'Spara sökning'}</Button>
        <Checkbox label="Mejla mig nya träffar varje morgon" checked={alerts} onChange={e => onSave(e.target.checked)} />
      </Stack>
      {error && <Text size="xs" tone="muted" role="alert">{error}</Text>}
    </Stack>
  );
}
