import type { AdminSection } from '@/constants/adminNav';
import { AdminUserRole } from '@/enums/adminUserRoleEnum';
import { PublicUserRole } from '@/enums/publicUserRoleEnum';

export type AppUserRole = AdminUserRole | PublicUserRole;

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export type ManagedResource = 'users' | 'content' | 'rooms' | 'bills' | 'tenants' | 'feedback';

type RolePolicy = {
  label: string;
  adminArea: boolean;
  sections: AdminSection[];
  actions: CrudAction[];
};

export const adminUserRoles: AdminUserRole[] = [AdminUserRole.SuperAdmin, AdminUserRole.Admin];
export const publicUserRoles: PublicUserRole[] = [PublicUserRole.Guest];
export const appUserRoles: AppUserRole[] = [...adminUserRoles, ...publicUserRoles];

const allSections: AdminSection[] = [
  'dashboard',
  'users',
  'content',
  'feedback',
  'rooms',
  'bills',
  'tenants',
  'summary',
];

const resourceSections: Record<ManagedResource, AdminSection> = {
  users: 'users',
  content: 'content',
  rooms: 'rooms',
  bills: 'bills',
  tenants: 'tenants',
  feedback: 'feedback',
};

const rolePolicies: Record<AppUserRole, RolePolicy> = {
  [AdminUserRole.SuperAdmin]: {
    label: 'Super Admin',
    adminArea: true,
    sections: allSections,
    actions: ['create', 'read', 'update', 'delete'],
  },
  [AdminUserRole.Admin]: {
    label: 'Administrator',
    adminArea: true,
    sections: allSections,
    actions: ['read'],
  },
  [PublicUserRole.Guest]: {
    label: 'Guest',
    adminArea: false,
    sections: [],
    actions: [],
  },
};

export function isAppUserRole(value: string | null | undefined): value is AppUserRole {
  return value != null && appUserRoles.includes(value as AppUserRole);
}

export function isGuestRole(role: AppUserRole | null | undefined): boolean {
  return role === PublicUserRole.Guest;
}

export function isSuperAdminRole(role: AppUserRole | null | undefined): boolean {
  return role === AdminUserRole.SuperAdmin;
}

export function roleLabel(role: AppUserRole | null | undefined): string {
  return role ? rolePolicies[role].label : '—';
}

export function canAccessAdminArea(role: AppUserRole | null | undefined): boolean {
  return role ? rolePolicies[role].adminArea : false;
}

export function canAccessSection(
  role: AppUserRole | null | undefined,
  section: AdminSection,
): boolean {
  return role ? rolePolicies[role].sections.includes(section) : false;
}

export function can(
  role: AppUserRole | null | undefined,
  action: CrudAction,
  resource: ManagedResource = 'users',
): boolean {
  if (!role) {
    return false;
  }
  if (!canAccessSection(role, resourceSections[resource])) {
    return false;
  }
  return rolePolicies[role].actions.includes(action);
}

export function canManage(
  role: AppUserRole | null | undefined,
  resource: ManagedResource = 'users',
): boolean {
  return can(role, 'create', resource) || can(role, 'update', resource) || can(role, 'delete', resource);
}
