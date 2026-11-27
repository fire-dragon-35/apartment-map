import { Button, ButtonLink, Text } from '@frame/ui';
import { Stack } from '@frame/core';
import { BillingPortalButton, useAuth, useSubscription } from '@frame/supabase';
import { ROUTES } from '../../app/useRoute.ts';
import { SignIn } from '../plus/SignIn.tsx';
import { ContentPage } from './ContentPage.tsx';

/** Konto: signed out, the sign-in (which also creates the account); signed in, who you are, your plan, sign out. */
export function Account() {
  const { user, loading, signOut } = useAuth();
  const { active } = useSubscription();
  if (loading) return null;
  if (!user) return <ContentPage title="Logga in" lead="Med Google eller en länk till din e-post. Är du ny skapas kontot direkt."><SignIn /></ContentPage>;
  return (
    <ContentPage title="Konto" lead={`Inloggad som ${user.email}`}>
      <Stack gap={3} align="center">
        {active
          ? <><Text as="p" tone="secondary">Du har Plus.</Text><BillingPortalButton variant="secondary" returnPath="/#/konto">Hantera abonnemang</BillingPortalButton></>
          : <><Text as="p" tone="secondary">Du har gratisversionen.</Text><ButtonLink href={ROUTES.plus}>Skaffa Plus</ButtonLink></>}
        <Button variant="ghost" onClick={() => void signOut()}>Logga ut</Button>
      </Stack>
    </ContentPage>
  );
}
