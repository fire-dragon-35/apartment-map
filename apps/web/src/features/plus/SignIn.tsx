import { Stack } from '@frame/core';
import { SignInForm } from '@frame/supabase';
import { SIGN_IN_LABELS } from './plan.ts';

export const SIGN_IN_TITLE = 'Logga in eller skapa konto';

/** The one sign-in view, on the account page and on the Plus page: Google, or an email link. Signing up is the same step. */
export function SignIn() {
  return (
    <Stack gap={3} align="center">
      <SignInForm google labels={SIGN_IN_LABELS} />
    </Stack>
  );
}
