import { Container, Stack } from '@frame/core';
import { Button, Text } from '@frame/ui';
import { BillingPortalButton, CheckoutButton, Paywall, RequireAuth, SignInForm, useAuth } from '@frame/supabase';

const LABELS = { email: 'E-post', submit: 'Skicka inloggningslänk', sent: 'Kolla din inkorg, vi har skickat en inloggningslänk.', invalid: 'Skriv en giltig e-postadress.' };

/** Logga in, skapa konto and the account itself: one page. Sign in is a magic link, so signing up is the same form. */
export function Account({ title }: { title: string }) {
  const { user, signOut } = useAuth();
  return (
    <Container size="narrow">
      <Stack gap={4}>
        <h1>{user ? 'Ditt konto' : title}</h1>
        <RequireAuth fallback={<SignInForm labels={LABELS} />}>
          <Text as="p" tone="secondary">Inloggad som {user?.email}</Text>
          <Paywall fallback={<CheckoutButton>Uppgradera: egna platser på kartan</CheckoutButton>}>
            <Text as="p">Du har ett aktivt abonnemang.</Text>
            <BillingPortalButton variant="secondary">Hantera abonnemang</BillingPortalButton>
          </Paywall>
          <Button variant="ghost" onClick={() => void signOut()}>Logga ut</Button>
        </RequireAuth>
      </Stack>
    </Container>
  );
}
