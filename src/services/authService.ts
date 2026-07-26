import { toAdminUserModel, type AdminUserModel, type AdminUserRow } from '@/models/adminUserModel';
import { supabase } from '@/services/supabaseClient';

type MappableError = { message: string; code?: string } | null | undefined;

export type SignInResult = {
  profile: AdminUserModel;
};

export const EMAIL_NOT_CONFIRMED_MESSAGE =
  'Your email address is not confirmed yet. Open the confirmation link we sent to your inbox, then sign in again.';

export class ExpiredBiometricSessionError extends Error {
  constructor() {
    super('Your saved sign-in expired. Sign in with your password to re-enable biometrics.');
    this.name = 'ExpiredBiometricSessionError';
  }
}

export class EmailNotConfirmedError extends Error {
  constructor() {
    super(EMAIL_NOT_CONFIRMED_MESSAGE);
    this.name = 'EmailNotConfirmedError';
  }
}

export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isEmailNotConfirmed(error)) {
      throw new EmailNotConfirmedError();
    }
    throw new Error(mapAuthError(error));
  }

  return resolveSession(data.user.id);
}

export async function signOutAdmin(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAdminProfile(uuid: string): Promise<AdminUserModel | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle<AdminUserRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toAdminUserModel(data) : null;
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'recovery',
  });

  if (verifyError || !data.user) {
    throw new Error(mapAuthError(verifyError));
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    await supabase.auth.signOut();
    throw new Error(mapAuthError(updateError));
  }

  await supabase.auth.signOut();
}

export async function signInWithCachedBiometricSession(refreshToken: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    if (error?.name === 'AuthRetryableFetchError') {
      throw new Error(mapAuthError(error));
    }
    throw new ExpiredBiometricSessionError();
  }

  return resolveSession(data.session.user.id);
}

async function resolveSession(userId: string): Promise<SignInResult> {
  try {
    const profile = await fetchAdminProfile(userId);

    if (!profile) {
      throw new Error('This account has no Davaine profile yet. Contact an administrator.');
    }

    return { profile };
  } catch (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }
}

function isEmailNotConfirmed(error: MappableError): boolean {
  if (!error) {
    return false;
  }
  if (error.code === 'email_not_confirmed') {
    return true;
  }
  return error.message.toLowerCase().includes('email not confirmed');
}

export function mapAuthError(error: MappableError): string {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  if (isEmailNotConfirmed(error)) {
    return EMAIL_NOT_CONFIRMED_MESSAGE;
  }

  switch (error.code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'otp_expired':
      return 'That code is invalid or has expired. Request a new one.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'same_password':
      return 'Choose a password different from your current one.';
    case 'weak_password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email address already exists.';
    default:
      break;
  }

  if (error.message.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }

  return error.message;
}
