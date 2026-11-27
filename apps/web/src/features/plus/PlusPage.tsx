import { useEffect, useState } from 'react';
import { Panel, Stack } from '@frame/core';
import { ButtonLink, Heading, Text } from '@frame/ui';
import { BillingPortalButton, CheckoutButton, useAuth, useSubscription } from '@frame/supabase';
import { ROUTES } from '../../app/useRoute.ts';
import { ContentPage } from '../shell/ContentPage.tsx';
import { PlanCard } from './PlanCard.tsx';
import { PLAN } from './plan.ts';
import { SignIn } from './SignIn.tsx';

/** Back from Stripe with ?checkout=success: read once, then dropped from the address so a reload does not repeat it. */
function useJustPaid() {
  const [paid] = useState(() => new URLSearchParams(location.search).get('checkout') === 'success');
  useEffect(() => {
    if (paid) history.replaceState(null, '', location.pathname + location.hash);
  }, [paid]);
  return paid;
}

/** The webhook can land a few seconds after Stripe sends the user back: ask again every 2 s, for up to 30 s. */
function useWaitForActive(waiting: boolean) {
  const { active, refresh } = useSubscription();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!waiting || active) return;
    const tick = setInterval(() => void refresh(), 2000);
    const stop = setTimeout(() => { clearInterval(tick); setGaveUp(true); }, 30_000);
    return () => { clearInterval(tick); clearTimeout(stop); };
  }, [waiting, active, refresh]);
  return { active, gaveUp };
}

function Welcome({ active, gaveUp }: { active: boolean; gaveUp: boolean }) {
  return (
    <Panel>
      <Stack gap={3} align="start">
        <Heading level={2}>{active ? 'Välkommen till Plus' : 'Betalningen gick igenom'}</Heading>
        <Text as="p" size="md" tone="secondary">
          {active
            ? 'Allt är klart. Flytta pinnen till din egen plats, slå på mejl om nya träffar och sålla bort det du redan kollat.'
            : gaveUp ? 'Plus tar längre tid än vanligt att aktivera. Ladda om sidan om en minut.' : 'Vi aktiverar Plus, det tar några sekunder…'}
        </Text>
        {active && <ButtonLink href={ROUTES.karta}>Till kartan</ButtonLink>}
      </Stack>
    </Panel>
  );
}

/** Buying Plus, on one page: the plan, and in its card the one next step for this visitor (sign in, pay, or manage). */
export function PlusPage() {
  const { user, loading } = useAuth();
  const { active } = useSubscription();
  const justPaid = useJustPaid();
  const wait = useWaitForActive(justPaid);

  const action = loading ? null
    : !user ? (
      <Stack gap={2} align="center">
        <Text as="p" size="sm" tone="secondary" align="center">Logga in för att köpa. Nytt konto skapas automatiskt.</Text>
        <SignIn />
      </Stack>
    )
    : active ? <BillingPortalButton variant="secondary" returnPath="/#/plus">Hantera abonnemang</BillingPortalButton>
    : <CheckoutButton returnPath="/#/plus">Betala {PLAN.price} {PLAN.unit}</CheckoutButton>;

  return (
    <ContentPage title="Plus">
      {justPaid && <Welcome {...wait} />}
      <PlanCard action={action} />
    </ContentPage>
  );
}
