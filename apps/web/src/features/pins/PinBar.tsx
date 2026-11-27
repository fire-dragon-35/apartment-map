import { Stack } from '@frame/core';
import { Badge, Button, ButtonLink, Checkbox, Text } from '@frame/ui';
import { useEffect, useRef, useState } from 'react';
import { TOKENS } from '@lk/shared';
import { ROUTES } from '../../app/useRoute.ts';
import { isDefault, type Pin } from './usePins.ts';
import styles from './PinBar.module.css';

interface Props {
  pins: Pin[];
  canEdit: boolean;
  onReset: () => void;
  placing: boolean;
  onPlacing: (on: boolean) => void;
  alerts: boolean;
  onSave: (alerts: boolean) => void;
  saved: boolean;
  error: string | null;
}

/** In the header toolbar: the pins restid is measured to, and the saved search. Everything but Karlaplan is paid (CORE.md). */
export function PinBar({ pins, canEdit, onReset, placing, onPlacing, alerts, onSave, saved, error }: Props) {
  const [upsell, setUpsell] = useState(false);
  const offer = useRef<HTMLDivElement>(null);
  // the offer floats over the page, like the filter panel: close it on a click outside or Escape
  useEffect(() => {
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !offer.current?.contains(e.target as Node)) setUpsell(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);

  if (!canEdit) {
    return (
      <div className={styles.end} ref={offer}>
        <Button variant="secondary" onClick={() => setUpsell(u => !u)} aria-expanded={upsell}>
          Egna platser och bevakning <Badge tone="custom" color="var(--color-background)" background={TOKENS.accent}>Plus</Badge>
        </Button>
        {upsell && (
          <div className={styles.upsell}>
            <Stack gap={2}>
              <Text as="p" size="sm">Med Plus flyttar du pinnen från centrum till din egen plats (jobb, skola), sparar din sökning och får ett mejl när något nytt passar.</Text>
              <ButtonLink href={ROUTES.plus}>Läs mer och skaffa Plus</ButtonLink>
            </Stack>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {placing
        ? <Button variant="ghost" onClick={() => onPlacing(false)}>Avbryt</Button>
        : <><Button variant="secondary" onClick={() => onPlacing(true)}>Flytta pinnen</Button>
          {!isDefault(pins) && <Button variant="ghost" onClick={onReset}>Tillbaka till centrum</Button>}</>}
      {placing && <div className={styles.row}><Text size="xs" role="status">Dra pinnen eller tryck på kartan där den ska stå.</Text></div>}
      <div className={styles.row}>
        <Button variant="secondary" onClick={() => onSave(alerts)}>{saved ? 'Uppdatera sparad sökning' : 'Spara sökning'}</Button>
        <Checkbox label="Mejla mig nya träffar varje morgon" checked={alerts} onChange={e => onSave(e.target.checked)} />
      </div>
      {error && <div className={styles.row}><Text size="xs" tone="muted" role="alert">{error}</Text></div>}
    </>
  );
}
