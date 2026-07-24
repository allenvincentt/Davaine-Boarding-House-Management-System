import type { AppIconName } from './icons';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'content'
  | 'feedback'
  | 'rooms'
  | 'bills'
  | 'tenants'
  | 'summary';

export type AdminNavItem = {
  section: AdminSection;
  label: string;
  icon: AppIconName;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavGroup[] = [
  {
    label: 'Home',
    items: [{ section: 'dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    label: 'Administrative',
    items: [
      { section: 'users', label: 'User Management', icon: 'users' },
      { section: 'content', label: 'Content', icon: 'document' },
      { section: 'feedback', label: 'Feedback', icon: 'feedback' },
    ],
  },
  {
    label: 'Operation',
    items: [
      { section: 'rooms', label: 'Room Management', icon: 'rooms' },
      { section: 'bills', label: 'Bills', icon: 'money' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { section: 'tenants', label: 'Tenant Directory', icon: 'directory' },
      { section: 'summary', label: 'Monthly Summary', icon: 'chart' },
    ],
  },
];

export const adminNavFlat: AdminNavItem[] = adminNavigation.flatMap((group) => group.items);

export const adminSectionPaths = {
  dashboard: '/admin-pages/DashboardPage',
  users: '/admin-pages/UserManagementPage',
  content: '/admin-pages/ContentPage',
  feedback: '/admin-pages/FeedbackPage',
  rooms: '/admin-pages/RoomManagementPage',
  bills: '/admin-pages/BillsPage',
  tenants: '/admin-pages/TenantDirectoryPage',
  summary: '/admin-pages/MonthlySummaryPage',
} as const satisfies Record<AdminSection, string>;
