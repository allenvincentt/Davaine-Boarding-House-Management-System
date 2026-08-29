import { usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSnackbar } from '@/components/common/Snackbar';
import { PageRefreshProvider, type PageRefreshValue } from '@/components/layout/PageRefreshContext';
import { SideBar } from '@/components/layout/SideBar';
import { TopBar } from '@/components/layout/TopBar';
import { ConfirmDialog } from '@/components/ui/modals/ConfirmDialog';
import { adminSectionPaths, type AdminSection } from '@/constants/adminNav';
import { DefaultTheme } from '@/constants/defaultTheme';
import { AdminUserRole } from '@/enums/adminUserRoleEnum';
import { useAuth } from '@/providers/AuthProvider';
import { UserProfileModal } from '@/app/UserProfileModal';

const REFRESH_MIN_DURATION = 650;
const REFRESH_SETTLE_DURATION = 220;

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
  const snackbar = useSnackbar();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSession, setProfileSession] = useState(0);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contentKey, setContentKey] = useState(0);

  const pullToRefreshEnabled = compact && Platform.OS !== 'web';
  const refreshingRef = useRef(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (reloadTimer.current) {
        clearTimeout(reloadTimer.current);
      }
      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
      }
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;
    setRefreshing(true);

    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      setContentKey((current) => current + 1);

      settleTimer.current = setTimeout(() => {
        settleTimer.current = null;
        refreshingRef.current = false;
        setRefreshing(false);
      }, REFRESH_SETTLE_DURATION);
    }, REFRESH_MIN_DURATION);
  }, []);

  const refreshValue = useMemo<PageRefreshValue>(
    () => ({ enabled: pullToRefreshEnabled, refreshing, onRefresh: handleRefresh }),
    [pullToRefreshEnabled, refreshing, handleRefresh],
  );

  const activeSection = sectionForPath(pathname);
  const adminName = profile?.fullName ?? 'Admin';
  const adminRole = profile?.userRole === AdminUserRole.SuperAdmin ? 'Super Admin' : 'Administrator';

  const handleNavigate = (section: AdminSection) => {
    router.push(adminSectionPaths[section]);
  };

  const handleOpenProfile = () => {
    setProfileSession((current) => current + 1);
    setProfileOpen(true);
  };

  const handleSignOut = async () => {
    const pending = snackbar.loading('Signing you out…');
    try {
      await signOut();
      router.replace('/');
      snackbar.update(pending, { tone: 'success', message: 'You have been signed out.' });
    } catch (error) {
      snackbar.update(pending, {
        tone: 'error',
        message: error instanceof Error ? error.message : 'Sign out failed. Please try again.',
      });
    }
  };

  const signOutDialog = (
    <ConfirmDialog
      visible={signOutOpen}
      icon="signOut"
      tone="destructive"
      title="Sign out?"
      message={`You are signed in as ${adminName}. You will need to sign in again to manage Davaine.`}
      confirmLabel="Sign out"
      onConfirm={handleSignOut}
      onClose={() => setSignOutOpen(false)}
    />
  );

  if (compact) {
    return (
      <View style={styles.page}>
        <StatusBar style="dark" />
        <View style={styles.mobileColumn}>
          <PageRefreshProvider value={refreshValue}>
            <Fragment key={contentKey}>{children}</Fragment>
          </PageRefreshProvider>
          <TopBar
            style={[styles.topBarFloating, { top: safeAreaTop + 12 }]}
            searchValue={search}
            onSearchChange={setSearch}
            adminName={adminName}
            adminRole={adminRole}
            onProfilePress={handleOpenProfile}
            onSignOut={() => setSignOutOpen(true)}
          />
        </View>
        <SideBar
          activeSection={activeSection}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
        />
        <UserProfileModal
          key={profileSession}
          visible={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
        {signOutDialog}
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <View style={[styles.row, { paddingTop: safeAreaTop, paddingBottom: safeAreaBottom }]}>
        <SideBar
          activeSection={activeSection}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
          onSignOut={() => setSignOutOpen(true)}
        />
        <View style={styles.contentColumn}>
          {children}
          <TopBar
            style={[styles.topBarFloating, styles.topBarFloatingDesktop]}
            searchValue={search}
            onSearchChange={setSearch}
            adminName={adminName}
            adminRole={adminRole}
            onProfilePress={handleOpenProfile}
            onSignOut={() => setSignOutOpen(true)}
          />
        </View>
      </View>
      <UserProfileModal
        key={profileSession}
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      {signOutDialog}
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
  topBarFloating: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
  },
  topBarFloatingDesktop: {
    top: 14,
  },
});
