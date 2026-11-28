import { Stack } from '@frame/core';
import { SignInForm } from '@frame/supabase';
import { SIGN_IN_LABELS } from './plan.ts';

/** The one sign-in view (Konto and the Plus page): Google, or an email link. A new email gets an account at once. */
export function SignIn() {
  return (
    <Stack gap={3} align="center">
      <SignInForm google labels={SIGN_IN_LABELS} />
    </Stack>
  );
}
