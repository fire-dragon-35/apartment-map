import { Badge, Button, ButtonLink, Checkbox, Text } from '@frame/ui';
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
    const plus = <Badge tone="neutral">Plus</Badge>;
    return (
      <div className={styles.tools}>
        <ButtonLink variant="ghost" href={ROUTES.plus}>Flytta pinnen {plus}</ButtonLink>
        <ButtonLink variant="ghost" href={ROUTES.plus}>Spara sökning {plus}</ButtonLink>
      </div>
    );
  }

  return (
    <>
      <div className={styles.tools}>
        {placing
          ? <Button variant="ghost" onClick={() => onPlacing(false)}>Avbryt</Button>
          : <Button variant="ghost" onClick={() => onPlacing(true)}>Flytta pinnen</Button>}
        <Button variant="ghost" onClick={() => onSave(alerts)}>{saved ? 'Uppdatera sökning' : 'Spara sökning'}</Button>
      </div>
      <div className={styles.row}>
        <Checkbox label="Mejla mig nya träffar varje morgon" checked={alerts} onChange={e => onSave(e.target.checked)} />
        {!placing && !isDefault(pins) && <Button variant="ghost" onClick={onReset}>Tillbaka till centrum</Button>}
      </div>
      {placing && <div className={styles.row}><Text size="xs" role="status">Dra pinnen eller tryck på kartan där den ska stå.</Text></div>}
      {error && <div className={styles.row}><Text size="xs" tone="muted" role="alert">{error}</Text></div>}
    </>
  );
}
