import type { AppUserRole } from '@/services/accessControl';

export type AccountStatus = 'Active' | 'Pending';

export type AdminUserModel = {
  uuid: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
  userRole: AppUserRole;
  emailConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserRow = {
  uuid: string;
  full_name: string;
  email: string;
  contact_number: string | null;
  user_role: AppUserRole;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function toAdminUserModel(row: AdminUserRow): AdminUserModel {
  return {
    uuid: row.uuid,
    fullName: row.full_name,
    email: row.email,
    contactNumber: row.contact_number,
    userRole: row.user_role,
    emailConfirmedAt: row.email_confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function accountStatusOf(user: AdminUserModel): AccountStatus {
  return user.emailConfirmedAt ? 'Active' : 'Pending';
}
