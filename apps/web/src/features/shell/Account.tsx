import { Button, ButtonLink, Text } from '@frame/ui';
import { Stack } from '@frame/core';
import { ContentPage } from './ContentPage.tsx';
import { BillingPortalButton, Paywall, RequireAuth, useAuth } from '@frame/supabase';
import { ROUTES } from '../../app/useRoute.ts';
import { SIGN_IN_TITLE, SignIn } from '../plus/SignIn.tsx';

/** Logga in, skapa konto and the account itself: one page. Google or an email link; signing up is the same step. */
export function Account() {
  const { user, signOut } = useAuth();
  return (
    <ContentPage title={user ? 'Ditt konto' : SIGN_IN_TITLE}>
      <Stack gap={4} align="center">
        <RequireAuth fallback={<SignIn />}>
          <Text as="p" tone="secondary">Inloggad som {user?.email}</Text>
          <Paywall fallback={<ButtonLink href={ROUTES.plus}>Skaffa Plus</ButtonLink>}>
            <Text as="p">Du har ett aktivt abonnemang.</Text>
            <BillingPortalButton variant="secondary">Hantera abonnemang</BillingPortalButton>
          </Paywall>
          <Button variant="ghost" onClick={() => void signOut()}>Logga ut</Button>
        </RequireAuth>
      </Stack>
    </ContentPage>
  );
}
