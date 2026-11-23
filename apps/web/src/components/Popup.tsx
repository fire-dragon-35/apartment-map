import type { Listing } from '../domain/Listing.ts';
import { Details } from './Details.tsx';

/** The popup body: the same lines as the card, then the link to the original ad. No route line. */
export function PopupBody({ l, today }: { l: Listing; today: string }) {
  return (
    <>
      <Details l={l} today={today} />
      {l.url && <a className="open" href={l.url} target="_blank" rel="noopener noreferrer">Öppna annons på {l.sourceName} ›</a>}
    </>
  );
}
