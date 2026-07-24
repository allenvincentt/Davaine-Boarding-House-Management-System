import { toAdminUserModel, type AdminUserModel, type AdminUserRow } from '@/models/adminUserModel';
import { supabase } from '@/services/supabaseClient';

export type SignInResult = {
  profile: AdminUserModel;
};

export async function signInAdmin(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(mapAuthError(error.message));
  }

  try {
    const profile = await fetchAdminProfile(data.user.id);

    if (!profile) {
      throw new Error('This account is not registered as an admin.');
    }

    return { profile };
  } catch (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }
}

export async function signOutAdmin(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAdminProfile(uuid: string): Promise<AdminUserModel | null> {
  const { data, error } = await supabase
    .schema('admin')
    .from('profiles')
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle<AdminUserRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toAdminUserModel(data) : null;
}

function mapAuthError(message: string): string {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  return message;
}
