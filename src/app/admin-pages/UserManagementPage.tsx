import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainContentArea } from '@/components/layout/MainContentArea';
import { AppIcon } from '@/components/ui/AppIcon';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Card } from '@/components/ui/cards/Card';
import { KPICard, KPICardsRow } from '@/components/ui/cards/KPICards';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/modals/ConfirmDialog';
import { Modal } from '@/components/ui/modals/Modal';
import { SearchField } from '@/components/ui/SearchField';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { Table, type TableColumn } from '@/components/ui/Table';
import { DefaultTheme } from '@/constants/defaultTheme';

type UserRole = 'Administrator' | 'Staff' | 'Tenant' | 'Maintenance';
type UserStatus = 'Online' | 'Offline';
type RoleFilter = 'All' | UserRole;

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string;
  role: UserRole;
  status: UserStatus;
};

const userRoles: UserRole[] = ['Administrator', 'Staff', 'Tenant', 'Maintenance'];

const roleTone: Record<UserRole, { color: string; background: string }> = {
  Administrator: { color: '#7C5CD6', background: '#EDE7F6' },
  Staff: { color: DefaultTheme.colors.blue, background: DefaultTheme.colors.softBlue },
  Tenant: { color: DefaultTheme.colors.primary, background: DefaultTheme.colors.softOlive },
  Maintenance: { color: '#C98A1E', background: DefaultTheme.colors.softGold },
};

const avatarPalette = [
  DefaultTheme.colors.primary,
  '#4EA4E5',
  '#7C5CD6',
  '#C98A1E',
  '#2E8A57',
  '#C4453B',
];

const ONLINE_COLOR = '#2E8A57';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_COLUMN_WIDTH = 620;
const CONTACT_COLUMN_WIDTH = 820;

const seedUsers: UserRecord[] = [
  {
    id: 'u1',
    fullName: 'Maria Santos',
    email: 'm.santos@davaine.ph',
    contactNumber: '+63 917 123 4567',
    role: 'Administrator',
    status: 'Online',
  },
  {
    id: 'u2',
    fullName: 'James Reyes',
    email: 'j.reyes@davaine.ph',
    contactNumber: '+63 918 234 5678',
    role: 'Staff',
    status: 'Online',
  },
  {
    id: 'u3',
    fullName: 'Ana Cruz',
    email: 'a.cruz@davaine.ph',
    contactNumber: '+63 919 345 6789',
    role: 'Tenant',
    status: 'Offline',
  },
  {
    id: 'u4',
    fullName: 'Carlos Dela Rosa',
    email: 'c.delarosa@davaine.ph',
    contactNumber: '+63 920 456 7890',
    role: 'Tenant',
    status: 'Offline',
  },
  {
    id: 'u5',
    fullName: 'Liza Mendoza',
    email: 'l.mendoza@davaine.ph',
    contactNumber: '+63 921 567 8901',
    role: 'Maintenance',
    status: 'Online',
  },
  {
    id: 'u6',
    fullName: 'Ramon Villanueva',
    email: 'r.villanueva@davaine.ph',
    contactNumber: '+63 922 678 9012',
    role: 'Tenant',
    status: 'Online',
  },
  {
    id: 'u7',
    fullName: 'Sofia Aquino',
    email: 's.aquino@davaine.ph',
    contactNumber: '+63 923 789 0123',
    role: 'Staff',
    status: 'Offline',
  },
  {
    id: 'u8',
    fullName: 'Noel Ferrer',
    email: 'n.ferrer@davaine.ph',
    contactNumber: '+63 924 890 1234',
    role: 'Staff',
    status: 'Online',
  },
];

function initialsOf(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const source = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
  return source.toUpperCase();
}

function avatarColorOf(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash + name.charCodeAt(index)) % avatarPalette.length;
  }
  return avatarPalette[hash];
}

export default function UserManagementPage() {
  const { width } = useWindowDimensions();
  const { bottom: safeAreaBottom } = useSafeAreaInsets();
  const compact = width < DefaultTheme.layout.compactNavigation;

  const [users, setUsers] = useState<UserRecord[]>(seedUsers);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [tableWidth, setTableWidth] = useState(0);

  const [actionsUser, setActionsUser] = useState<UserRecord | null>(null);
  const [actionsAnchor, setActionsAnchor] = useState<SelectAnchor | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formUser, setFormUser] = useState<UserRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<UserRecord | null>(null);

  const onlineCount = users.filter((user) => user.status === 'Online').length;
  const offlineCount = users.length - onlineCount;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== 'All' && user.role !== roleFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.contactNumber.toLowerCase().includes(term)
      );
    });
  }, [users, query, roleFilter]);

  const handleTableLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    setTableWidth((current) => (current === measured ? current : measured));
  }, []);

  const openActions = useCallback((user: UserRecord, anchor: SelectAnchor) => {
    setActionsUser(user);
    setActionsAnchor(anchor);
    setActionsOpen(true);
  }, []);

  const openForm = useCallback((mode: FormMode, user: UserRecord | null) => {
    setFormMode(mode);
    setFormUser(user);
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === id ? { ...user, status: user.status === 'Online' ? 'Offline' : 'Online' } : user,
      ),
    );
  }, []);

  const handleSubmit = useCallback(
    (draft: UserRecord) => {
      setUsers((current) => {
        const exists = current.some((user) => user.id === draft.id);
        return exists ? current.map((user) => (user.id === draft.id ? draft : user)) : [...current, draft];
      });
      setFormOpen(false);
    },
    [setUsers],
  );

  const actionOptions = useMemo<SelectOption[]>(() => {
    if (!actionsUser) {
      return [];
    }

    return [
      {
        key: 'view',
        label: 'View Profile',
        icon: 'user',
        onSelect: () => openForm('view', actionsUser),
      },
      {
        key: 'edit',
        label: 'Edit User',
        icon: 'edit',
        onSelect: () => openForm('edit', actionsUser),
      },
      {
        key: 'status',
        label: actionsUser.status === 'Online' ? 'Set Offline' : 'Set Online',
        icon: 'power',
        onSelect: () => toggleStatus(actionsUser.id),
      },
      {
        key: 'delete',
        label: 'Delete User',
        icon: 'trash',
        destructive: true,
        onSelect: () => setPendingDelete(actionsUser),
      },
    ];
  }, [actionsUser, openForm, toggleStatus]);

  const columns = useMemo<TableColumn<UserRecord>[]>(() => {
    const list: TableColumn<UserRecord>[] = [
      {
        key: 'fullName',
        header: 'Full Name',
        render: (row) => (
          <View style={styles.nameCell}>
            <Avatar name={row.fullName} />
            <Text style={styles.nameText} numberOfLines={1}>
              {row.fullName}
            </Text>
          </View>
        ),
      },
    ];

    if (tableWidth >= EMAIL_COLUMN_WIDTH) {
      list.push({
        key: 'email',
        header: 'Email',
        render: (row) => (
          <Text style={styles.emailText} numberOfLines={1}>
            {row.email}
          </Text>
        ),
      });
    }

    if (tableWidth >= CONTACT_COLUMN_WIDTH) {
      list.push({
        key: 'contactNumber',
        header: 'Contact Number',
        width: 160,
        accessor: (row) => row.contactNumber,
      });
    }

    list.push(
      {
        key: 'role',
        header: 'Role',
        width: 128,
        render: (row) => <RoleBadge role={row.role} />,
      },
      {
        key: 'status',
        header: 'Status',
        width: 104,
        render: (row) => <StatusLabel status={row.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        width: 62,
        align: 'right',
        render: (row) => (
          <RowActionsButton user={row} onOpen={(anchor) => openActions(row, anchor)} />
        ),
      },
    );

    return list;
  }, [tableWidth, openActions]);

  return (
    <View style={styles.page}>
      <MainContentArea>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>Manage system users, roles, and access levels.</Text>
          </View>
          {!compact && (
            <GradientButton
              accessibilityLabel="Add user"
              style={styles.addButton}
              onPress={() => openForm('create', null)}>
              <AppIcon name="plus" size={15} tintColor={DefaultTheme.colors.white} />
              <Text style={styles.addButtonLabel}>Add User</Text>
            </GradientButton>
          )}
        </View>

        <KPICardsRow>
          <KPICard
            label="Total Users"
            value={users.length}
            icon="users"
            iconColor={DefaultTheme.colors.primary}
            iconBackground={DefaultTheme.colors.softOlive}
            accentColor={DefaultTheme.colors.primary}
            caption="All system accounts"
            progress={1}
          />
          <KPICard
            label="Online Now"
            value={onlineCount}
            icon="check"
            iconColor={ONLINE_COLOR}
            iconBackground="#E4F5EA"
            accentColor={ONLINE_COLOR}
            caption="Active in the system"
            progress={users.length === 0 ? 0 : onlineCount / users.length}
          />
          <KPICard
            label="Offline"
            value={offlineCount}
            icon="power"
            iconColor={DefaultTheme.colors.muted}
            iconBackground={DefaultTheme.colors.cool}
            accentColor={DefaultTheme.colors.muted}
            caption="Currently signed out"
            progress={users.length === 0 ? 0 : offlineCount / users.length}
          />
        </KPICardsRow>

        <Card style={styles.tableCard} revealDelay={320}>
          <View style={styles.toolbar}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, email, or contact…"
              style={styles.search}
            />
            <RoleFilterSelect
              value={roleFilter}
              onChange={setRoleFilter}
              style={compact && styles.roleFilterCompact}
            />
          </View>

          <View onLayout={handleTableLayout}>
            {compact ? (
              <View style={styles.mobileList}>
                {filtered.length === 0 ? (
                  <Text style={styles.emptyText}>No users match your filters.</Text>
                ) : (
                  filtered.map((user, index) => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      isLast={index === filtered.length - 1}
                      onOpenActions={(anchor) => openActions(user, anchor)}
                    />
                  ))
                )}
              </View>
            ) : (
              <Table
                columns={columns}
                data={filtered}
                keyExtractor={(row) => row.id}
                emptyLabel="No users match your filters."
              />
            )}
          </View>
        </Card>
      </MainContentArea>

      {compact && (
        <GradientButton
          variant="fab"
          accessibilityLabel="Add user"
          style={{ bottom: Math.max(safeAreaBottom, 10) + 82 }}
          onPress={() => openForm('create', null)}>
          <AppIcon name="plus" size={24} tintColor={DefaultTheme.colors.white} />
        </GradientButton>
      )}

      <Select
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        options={actionOptions}
        anchor={actionsAnchor}
        align="right"
        minWidth={182}
      />

      <UserFormModal
        key={formSession}
        visible={formOpen}
        mode={formMode}
        user={formUser}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        icon="trash"
        tone="destructive"
        title="Delete user?"
        message={`${pendingDelete?.fullName ?? 'This account'} will lose access to the Davaine system. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            setUsers((current) => current.filter((user) => user.id !== pendingDelete.id));
          }
        }}
        onClose={() => setPendingDelete(null)}
      />
    </View>
  );
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, backgroundColor: avatarColorOf(name) },
      ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const tone = roleTone[role];

  return (
    <View style={[styles.roleBadge, { backgroundColor: tone.background }]}>
      <Text style={[styles.roleBadgeText, { color: tone.color }]} numberOfLines={1}>
        {role}
      </Text>
    </View>
  );
}

function StatusLabel({ status }: { status: UserStatus }) {
  const online = status === 'Online';

  return (
    <View style={styles.statusRow}>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: online ? ONLINE_COLOR : DefaultTheme.colors.line },
        ]}
      />
      <Text
        style={[styles.statusText, online && styles.statusTextOnline]}
        numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
}

function RowActionsButton({
  user,
  onOpen,
}: {
  user: UserRecord;
  onOpen: (anchor: SelectAnchor) => void;
}) {
  const triggerRef = useRef<View>(null);
  const [hovered, setHovered] = useState(false);

  const handlePress = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      onOpen({ x, y, width, height });
    });
  };

  return (
    <Pressable
      ref={triggerRef}
      accessibilityRole="button"
      accessibilityLabel={`Actions for ${user.fullName}`}
      style={[styles.rowAction, hovered && styles.rowActionHovered]}
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      <AppIcon name="more" size={16} tintColor={DefaultTheme.colors.muted} />
    </Pressable>
  );
}

function RoleFilterSelect({
  value,
  onChange,
  style,
}: {
  value: RoleFilter;
  onChange: (role: RoleFilter) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const options = useMemo<SelectOption[]>(
    () =>
      (['All', ...userRoles] as RoleFilter[]).map((role) => ({
        key: role,
        label: role === 'All' ? 'All Roles' : role,
        icon: role === value ? 'check' : undefined,
        onSelect: () => onChange(role),
      })),
    [value, onChange],
  );

  const handlePress = () => {
    if (open) {
      setOpen(false);
      return;
    }
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <View style={style}>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel="Filter by role"
        accessibilityState={{ expanded: open }}
        style={[styles.roleTrigger, (hovered || open) && styles.roleTriggerActive]}
        onPress={handlePress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}>
        <Text style={styles.roleTriggerLabel} numberOfLines={1}>
          {value === 'All' ? 'All Roles' : value}
        </Text>
        <AppIcon
          name="chevronDown"
          size={13}
          tintColor={DefaultTheme.colors.muted}
          style={open && styles.chevronOpen}
        />
      </Pressable>
      <Select
        visible={open}
        onClose={() => setOpen(false)}
        options={options}
        anchor={anchor}
        align="right"
        minWidth={186}
      />
    </View>
  );
}

function UserListItem({
  user,
  isLast,
  onOpenActions,
}: {
  user: UserRecord;
  isLast: boolean;
  onOpenActions: (anchor: SelectAnchor) => void;
}) {
  return (
    <View style={[styles.mobileRow, isLast && styles.mobileRowLast]}>
      <Avatar name={user.fullName} size={38} />
      <View style={styles.mobileBody}>
        <Text style={styles.nameText} numberOfLines={1}>
          {user.fullName}
        </Text>
        <Text style={styles.emailText} numberOfLines={1}>
          {user.email}
        </Text>
        <Text style={styles.mobileContact} numberOfLines={1}>
          {user.contactNumber}
        </Text>
        <View style={styles.mobileMeta}>
          <RoleBadge role={user.role} />
          <StatusLabel status={user.status} />
        </View>
      </View>
      <RowActionsButton user={user} onOpen={onOpenActions} />
    </View>
  );
}

type FormMode = 'create' | 'edit' | 'view';

type FormErrors = Partial<Record<'fullName' | 'email' | 'contactNumber', string>>;

function UserFormModal({
  visible,
  mode,
  user,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  mode: FormMode;
  user: UserRecord | null;
  onClose: () => void;
  onSubmit: (user: UserRecord) => void;
}) {
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'Staff');
  const [errors, setErrors] = useState<FormErrors>({});

  const readOnly = mode === 'view';
  const title = mode === 'create' ? 'Add User' : mode === 'edit' ? 'Edit User' : user?.fullName ?? 'Profile';
  const subtitle =
    mode === 'create'
      ? 'Create a new account and assign its access level.'
      : mode === 'edit'
        ? 'Update the account details and access level.'
        : 'Account details and current access level.';

  const handleSave = () => {
    const nextErrors: FormErrors = {};
    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }
    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!contactNumber.trim()) {
      nextErrors.contactNumber = 'Contact number is required.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit({
      id: user?.id ?? `user-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim(),
      contactNumber: contactNumber.trim(),
      role,
      status: user?.status ?? 'Offline',
    });
  };

  return (
    <Modal visible={visible} onClose={onClose} contentStyle={styles.modalShell}>
      <View style={styles.modalBody}>
        <View style={styles.modalHeader}>
          {user ? (
            <Avatar name={user.fullName} size={44} />
          ) : (
            <View style={styles.modalIconBadge}>
              <AppIcon name="userPlus" size={20} tintColor={DefaultTheme.colors.primary} />
            </View>
          )}
          <View style={styles.modalHeaderText}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.modalSubtitle}>{subtitle}</Text>
          </View>
        </View>

        {readOnly ? (
          <View style={styles.detailList}>
            <DetailRow label="Email" value={user?.email ?? '—'} />
            <DetailRow label="Contact Number" value={user?.contactNumber ?? '—'} />
            <DetailRow label="Role" value={user?.role ?? '—'} />
            <DetailRow label="Status" value={user?.status ?? '—'} />
          </View>
        ) : (
          <View style={styles.formFields}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
              icon="user"
              autoCapitalize="words"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              icon="at"
              keyboardType="email-address"
            />
            <Input
              label="Contact Number"
              value={contactNumber}
              onChangeText={setContactNumber}
              error={errors.contactNumber}
              icon="phone"
              keyboardType="phone-pad"
            />
            <View style={styles.rolePicker}>
              <Text style={styles.rolePickerLabel}>Role</Text>
              <View style={styles.rolePickerOptions}>
                {userRoles.map((option) => {
                  const active = option === role;
                  const tone = roleTone[option];
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.roleOption,
                        active && { backgroundColor: tone.background, borderColor: tone.color },
                      ]}
                      onPress={() => setRole(option)}>
                      <Text
                        style={[styles.roleOptionText, active && { color: tone.color }]}
                        numberOfLines={1}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <View style={styles.modalActions}>
          <MatchaButton
            label={readOnly ? 'Close' : 'Cancel'}
            variant="outline"
            style={styles.modalAction}
            onPress={onClose}
          />
          {!readOnly && (
            <MatchaButton
              label={mode === 'create' ? 'Add User' : 'Save Changes'}
              style={styles.modalAction}
              onPress={handleSave}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 22,
  },
  subtitle: {
    marginTop: 4,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 22,
  },
  addButtonLabel: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
  },
  tableCard: {
    width: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  search: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 160,
  },
  roleFilterCompact: {
    flexGrow: 1,
    flexBasis: 152,
  },
  roleTrigger: {
    height: 42,
    minWidth: 152,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  roleTriggerActive: {
    borderColor: DefaultTheme.colors.primary,
    backgroundColor: DefaultTheme.colors.white,
  },
  roleTriggerLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  nameText: {
    flexShrink: 1,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  emailText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  avatar: {
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: DefaultTheme.radius.pill,
  },
  roleBadgeText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12,
  },
  statusTextOnline: {
    color: ONLINE_COLOR,
  },
  rowAction: {
    width: 30,
    height: 30,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowActionHovered: {
    backgroundColor: DefaultTheme.colors.cool,
    borderColor: DefaultTheme.colors.line,
  },
  mobileList: {
    width: '100%',
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  mobileRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  mobileBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mobileContact: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  mobileMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
  modalShell: {
    maxWidth: 440,
  },
  modalBody: {
    padding: DefaultTheme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBadge: {
    width: 44,
    height: 44,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 17,
  },
  modalSubtitle: {
    marginTop: 3,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  formFields: {
    marginTop: 22,
    gap: 18,
  },
  rolePicker: {
    gap: 8,
  },
  rolePickerLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  rolePickerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: DefaultTheme.radius.pill,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  roleOptionText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12,
  },
  detailList: {
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  detailLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  detailValue: {
    flexShrink: 1,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  modalActions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  modalAction: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});
