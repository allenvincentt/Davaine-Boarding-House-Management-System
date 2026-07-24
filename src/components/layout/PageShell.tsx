import { usePathname, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SideBar } from '@/components/layout/SideBar';
import { TopBar } from '@/components/layout/TopBar';
import { adminSectionPaths, type AdminSection } from '@/constants/adminNav';
import { DefaultTheme } from '@/constants/defaultTheme';
import { AdminUserRole } from '@/enums/adminUserRoleEnum';
import { useAuth } from '@/providers/AuthProvider';

type PageShellProps = {
  children: ReactNode;
};

function sectionForPath(pathname: string): AdminSection {
  const match = (Object.entries(adminSectionPaths) as [AdminSection, string][]).find(
    ([, path]) => path === pathname,
  );
  return match ? match[0] : 'dashboard';
}

export function PageShell({ children }: PageShellProps) {
  const { width } = useWindowDimensions();
  const { top: safeAreaTop, bottom: safeAreaBottom } = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const activeSection = sectionForPath(pathname);
  const adminName = profile?.fullName ?? 'Admin';
  const adminRole = profile?.userRole === AdminUserRole.SuperAdmin ? 'Super Admin' : 'Administrator';

  const handleNavigate = (section: AdminSection) => {
    router.push(adminSectionPaths[section]);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (compact) {
    return (
      <View style={styles.page}>
        <View style={styles.mobileColumn}>
          <TopBar
            style={[styles.topBar, { marginTop: safeAreaTop + 12 }]}
            searchValue={search}
            onSearchChange={setSearch}
            notificationCount={3}
            adminName={adminName}
            adminRole={adminRole}
            onSignOut={handleSignOut}
          />
          {children}
        </View>
        <SideBar
          activeSection={activeSection}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.row, { paddingTop: safeAreaTop, paddingBottom: safeAreaBottom }]}>
        <SideBar
          activeSection={activeSection}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
        />
        <View style={styles.contentColumn}>
          <TopBar
            style={styles.topBar}
            searchValue={search}
            onSearchChange={setSearch}
            notificationCount={3}
            adminName={adminName}
            adminRole={adminRole}
            onSignOut={handleSignOut}
          />
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: DefaultTheme.colors.background,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileColumn: {
    flex: 1,
  },
  contentColumn: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    marginHorizontal: 20,
    marginBottom: 4,
  },
});
