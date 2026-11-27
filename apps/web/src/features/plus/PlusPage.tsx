import { useEffect, useState } from 'react';
import { Panel, Stack } from '@frame/core';
import { ButtonLink, Heading, Text } from '@frame/ui';
import { Pricing } from '@frame/site';
import { BillingPortalButton, CheckoutButton, useAuth, useSubscription } from '@frame/supabase';
import { ROUTES, section } from '../../app/useRoute.ts';
import { ContentPage } from '../shell/ContentPage.tsx';
import { PLAN } from './plan.ts';
import { SIGN_IN_TITLE, SignIn } from './SignIn.tsx';

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
            ? 'Allt är klart. Börja med att flytta pinnen till din egen plats, och slå på mejl om nya träffar under kartan.'
            : gaveUp ? 'Plus tar längre tid än vanligt att aktivera. Ladda om sidan om en minut.' : 'Vi aktiverar Plus, det tar några sekunder…'}
        </Text>
        {active && <ButtonLink href={ROUTES.karta}>Till kartan</ButtonLink>}
      </Stack>
    </Panel>
  );
}

/**
 * Everything about buying Plus on one page: what it gives and costs, then the one next step for this visitor
 * (sign in, pay, or manage), and a welcome when Stripe sends the user back.
 */
export function PlusPage() {
  const { user, loading } = useAuth();
  const { active } = useSubscription();
  const justPaid = useJustPaid();
  const wait = useWaitForActive(justPaid);

  const action = loading ? null
    : !user ? <ButtonLink href={section('plus', 'logga-in')}>Kom igång</ButtonLink>
    : active ? <ButtonLink href={ROUTES.karta}>Till kartan</ButtonLink>
    : <CheckoutButton returnPath="/#/plus">Betala {PLAN.price} {PLAN.unit}</CheckoutButton>;

  return (
    <ContentPage title="EnkelLGH Plus" lead={PLAN.lead}>
      {justPaid && <Welcome {...wait} />}
      <Pricing price={PLAN.price} unit={PLAN.unit} note={PLAN.note} action={action} features={PLAN.features} />
      {!loading && !user && (
        <Stack id="logga-in" as="section" gap={3} align="center">
          <Heading level={2}>{SIGN_IN_TITLE}</Heading>
          <SignIn />
        </Stack>
      )}
      {user && active && !justPaid && (
        <Stack gap={2} align="center">
          <Text as="p" tone="secondary" align="center">Du har Plus. Kvitton, kort och uppsägning:</Text>
          <BillingPortalButton variant="secondary" returnPath="/#/plus">Hantera abonnemang</BillingPortalButton>
        </Stack>
      )}
    </ContentPage>
  );
}
