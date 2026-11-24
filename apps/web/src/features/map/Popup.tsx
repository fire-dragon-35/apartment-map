import { Stack } from '@frame/core';
import { Details, SourceLink } from '../listings/Details.tsx';
import type { Listing } from '../listings/Listing.ts';

/** DESIGN.md §7 popup: exactly the card's layout and link. No route line (the map draws the route). */
export function Popup({ l, today }: { l: Listing; today: string }) {
  return (
    <Stack gap={1}>
      <Details l={l} today={today} />
      <SourceLink l={l} />
    </Stack>
  );
}
