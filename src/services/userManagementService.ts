import { toAdminUserModel, type AdminUserModel, type AdminUserRow } from '@/models/adminUserModel';
import { PublicUserRole } from '@/enums/publicUserRoleEnum';
import type { AppUserRole } from '@/services/accessControl';
import { mapAuthError } from '@/services/authService';
import { supabase } from '@/services/supabaseClient';

export type CreateUserInput = {
  fullName: string;
  email: string;
  contactNumber: string;
  userRole: AppUserRole;
  temporaryPassword: string;
};

export type CreateUserResult = {
  profile: AdminUserModel | null;
  confirmationEmailSent: boolean;
};

export type UpdateOwnProfileInput = {
  fullName: string;
  contactNumber: string;
};

const profilesTable = () => supabase.from('profiles');

export async function listUsers(): Promise<AdminUserModel[]> {
  const { data, error } = await profilesTable()
    .select('*')
    .order('created_at', { ascending: true })
    .returns<AdminUserRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toAdminUserModel);
}

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const { data: existingSession } = await supabase.auth.getSession();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.temporaryPassword,
    options: {
      data: {
        full_name: input.fullName,
        contact_number: input.contactNumber,
      },
    },
  });

  if (data.session && existingSession.session) {
    await supabase.auth.setSession({
      access_token: existingSession.session.access_token,
      refresh_token: existingSession.session.refresh_token,
    });
  }

  if (error) {
    throw new Error(mapAuthError(error));
  }

  if (!data.user) {
    throw new Error('The account could not be created. Please try again.');
  }

  if (data.user.identities && data.user.identities.length === 0) {
    throw new Error('An account with this email address already exists.');
  }

  const profile =
    input.userRole === PublicUserRole.Guest
      ? await fetchProfile(data.user.id)
      : await updateUserRole(data.user.id, input.userRole);

  return { profile, confirmationEmailSent: data.session == null };
}

export async function updateUserRole(uuid: string, userRole: AppUserRole): Promise<AdminUserModel> {
  const { data, error } = await profilesTable()
    .update({ user_role: userRole })
    .eq('uuid', uuid)
    .select('*')
    .single<AdminUserRow>();

  if (error) {
    throw new Error(mapPostgrestError(error, 'You are not allowed to change user roles.'));
  }

  return toAdminUserModel(data);
}

export async function deactivateUser(uuid: string): Promise<AdminUserModel> {
  return updateUserRole(uuid, PublicUserRole.Guest);
}

export async function deleteUser(uuid: string): Promise<void> {
  const { error } = await supabase.rpc('delete_user', { target: uuid });

  if (error) {
    throw new Error(mapPostgrestError(error, 'You are not allowed to delete users.'));
  }
}

export async function updateOwnProfile(input: UpdateOwnProfileInput): Promise<AdminUserModel> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uuid = sessionData.session?.user.id;

  if (!uuid) {
    throw new Error('Your session expired. Sign in again to update your profile.');
  }

  const { data, error } = await profilesTable()
    .update({
      full_name: input.fullName,
      contact_number: input.contactNumber.trim() === '' ? null : input.contactNumber.trim(),
    })
    .eq('uuid', uuid)
    .select('*')
    .single<AdminUserRow>();

  if (error) {
    throw new Error(mapPostgrestError(error, 'Your profile could not be updated.'));
  }

  return toAdminUserModel(data);
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData.session?.user.email;

  if (!email) {
    throw new Error('Your session expired. Sign in again to change your password.');
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (reauthError) {
    throw new Error('Your current password is incorrect.');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function fetchPasswordFingerprint(): Promise<string | null> {
  const { data, error } = await supabase.rpc('current_password_fingerprint');

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === 'string' ? data : null;
}

async function fetchProfile(uuid: string): Promise<AdminUserModel | null> {
  const { data, error } = await profilesTable()
    .select('*')
    .eq('uuid', uuid)
    .maybeSingle<AdminUserRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toAdminUserModel(data) : null;
}

function mapPostgrestError(error: { message: string; code?: string }, fallback: string): string {
  if (error.code === '42501' || error.message.toLowerCase().includes('row-level security')) {
    return fallback;
  }
  return error.message;
}
