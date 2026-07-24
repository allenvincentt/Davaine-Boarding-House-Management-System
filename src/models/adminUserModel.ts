import type { AdminUserRole } from '@/enums/adminUserRoleEnum';

export type AdminUserModel = {
  uuid: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
  userRole: AdminUserRole;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserRow = {
  uuid: string;
  full_name: string;
  email: string;
  contact_number: string | null;
  user_role: AdminUserRole;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
