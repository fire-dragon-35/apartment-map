import { Badge, Button, ButtonLink, Checkbox, Text } from '@frame/ui';
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

/** In the header toolbar: the pins restid is measured to, and the saved search. Everything but centrum is paid (CORE.md). */
export function PinBar({ pins, canEdit, onReset, placing, onPlacing, alerts, onSave, saved, error }: Props) {
  if (!canEdit) {
    // the same two tools as with Plus, each a link to the Plus page, so the free map shows what Plus adds
    const plus = <Badge tone="custom" color="var(--color-background)" background={TOKENS.accent}>Plus</Badge>;
    return (
      <>
        <ButtonLink variant="secondary" href={ROUTES.plus}>Flytta pinnen {plus}</ButtonLink>
        <ButtonLink variant="secondary" href={ROUTES.plus}>Spara sökning {plus}</ButtonLink>
      </>
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
