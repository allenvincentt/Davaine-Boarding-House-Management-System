import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import {
  CreateUpdateRoomModal,
  type RoomFormMode,
  type RoomFormSubmit,
} from '@/app/admin-pages/CreateUpdateRoomModal';
import { RoomDetailsModal } from '@/app/admin-pages/RoomDetailsModal';
import { MainContentArea } from '@/components/layout/MainContentArea';
import { AppIcon } from '@/components/ui/AppIcon';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { Card } from '@/components/ui/cards/Card';
import { KPICard, KPICardsRow } from '@/components/ui/cards/KPICards';
import { ConfirmDialog } from '@/components/ui/modals/ConfirmDialog';
import { SearchField } from '@/components/ui/SearchField';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { Table, type TableColumn } from '@/components/ui/Table';
import { DefaultTheme } from '@/constants/defaultTheme';
import {
  buildingLabel,
  dueSummaryOf,
  formatPeso,
  isDueThisWeek,
  isDueToday,
  remainingCapacityOf,
  roomBuildings,
  roomLabel,
  roomShortLabel,
  roomStatusOf,
  sortRooms,
  type RoomBuilding,
  type RoomModel,
  type RoomStatus,
} from '@/models/roomModel';
import { useAuth } from '@/providers/AuthProvider';
import { can } from '@/services/accessControl';
import {
  addRenters,
  listRooms,
  releaseRoom,
  updateRoom,
} from '@/services/roomManagementService';

type StatusFilter = 'All' | RoomStatus;
type BuildingFilter = 'All' | RoomBuilding;

const statusTone: Record<RoomStatus, { color: string; background: string }> = {
  Occupied: { color: '#4EA4E5', background: DefaultTheme.colors.softBlue },
  Available: { color: '#2E8A57', background: '#E4F5EA' },
};

const OCCUPIED_COLOR = '#4EA4E5';
const AVAILABLE_COLOR = '#4C8A2E';
const TENANT_COLOR = '#7C5CD6';
const DUE_TODAY_COLOR = '#C98A1E';
const DUE_WEEK_COLOR = '#C4453B';

const TOTAL_TENANT_COLUMN_WIDTH = 700;
const DUE_COLUMN_WIDTH = 880;
const MOBILE_TENANT_PREVIEW = 3;

export default function RoomManagementPage() {
  const { width } = useWindowDimensions();
  const { bottom: safeAreaBottom } = useSafeAreaInsets();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const { profile } = useAuth();

  const role = profile?.userRole ?? null;
  const canCreate = can(role, 'create', 'rooms');
  const canUpdate = can(role, 'update', 'rooms');
  const canDelete = can(role, 'delete', 'rooms');
  const readOnly = !canCreate && !canUpdate && !canDelete;

  const [rooms, setRooms] = useState<RoomModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [buildingFilter, setBuildingFilter] = useState<BuildingFilter>('All');
  const [tableWidth, setTableWidth] = useState(0);

  const [actionsRoom, setActionsRoom] = useState<RoomModel | null>(null);
  const [actionsAnchor, setActionsAnchor] = useState<SelectAnchor | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const [formMode, setFormMode] = useState<RoomFormMode>('create');
  const [formRoom, setFormRoom] = useState<RoomModel | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);

  const [detailsRoom, setDetailsRoom] = useState<RoomModel | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingRelease, setPendingRelease] = useState<RoomModel | null>(null);

  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listRooms();
      if (activeRef.current) {
        setRooms(rows);
      }
    } catch (error) {
      if (activeRef.current) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load rooms.');
      }
    } finally {
      if (activeRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((room) => roomStatusOf(room) === 'Occupied').length;
  const availableRooms = totalRooms - occupiedRooms;
  const totalTenants = rooms.reduce((sum, room) => sum + room.tenants.length, 0);
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const dueTodayCount = rooms.filter((room) => isDueToday(room)).length;
  const dueThisWeekCount = rooms.filter((room) => isDueThisWeek(room)).length;
  const occupancyRate = totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rooms.filter((room) => {
      if (statusFilter !== 'All' && roomStatusOf(room) !== statusFilter) {
        return false;
      }
      if (buildingFilter !== 'All' && room.building !== buildingFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        roomLabel(room).toLowerCase().includes(term) ||
        roomShortLabel(room).toLowerCase().includes(term) ||
        room.tenants.some(
          (tenant) =>
            tenant.fullName.toLowerCase().includes(term) ||
            (tenant.contactNumber ?? '').toLowerCase().includes(term),
        )
      );
    });
  }, [rooms, query, statusFilter, buildingFilter]);

  const handleTableLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    setTableWidth((current) => (current === measured ? current : measured));
  }, []);

  const applyRoom = useCallback((next: RoomModel) => {
    setRooms((current) =>
      sortRooms(current.map((room) => (room.id === next.id ? next : room))),
    );
    setDetailsRoom((current) => (current && current.id === next.id ? next : current));
  }, []);

  const openActions = useCallback((room: RoomModel, anchor: SelectAnchor) => {
    setActionsRoom(room);
    setActionsAnchor(anchor);
    setActionsOpen(true);
  }, []);

  const openForm = useCallback((mode: RoomFormMode, room: RoomModel | null) => {
    setNotice(null);
    setActionError(null);
    setFormMode(mode);
    setFormRoom(room);
    setFormSession((current) => current + 1);
    setFormOpen(true);
  }, []);

  const openDetails = useCallback((room: RoomModel) => {
    setDetailsRoom(room);
    setDetailsOpen(true);
  }, []);

  const handleCreate = useCallback(
    async (input: RoomFormSubmit) => {
      const updated = await addRenters(input.roomId, input.renters);
      applyRoom(updated);
      setNotice(
        `${input.renters.length} renter(s) were added to ${roomLabel(updated)}. The room is now ${roomStatusOf(
          updated,
        ).toLowerCase()}.`,
      );
    },
    [applyRoom],
  );

  const handleUpdate = useCallback(
    async (input: RoomFormSubmit) => {
      const updated = await updateRoom(input.roomId, {
        rate: input.rate,
        renters: input.renters,
      });
      applyRoom(updated);
      setNotice(`${roomLabel(updated)} was updated to ${formatPeso(updated.rate)} per month.`);
    },
    [applyRoom],
  );

  const handleRelease = useCallback(
    async (room: RoomModel) => {
      setActionError(null);
      const removed = room.tenants.length;
      try {
        const updated = await releaseRoom(room.id);
        applyRoom(updated);
        setNotice(`${roomLabel(updated)} is now available. ${removed} tenant(s) were removed.`);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'The room could not be updated.',
        );
      }
    },
    [applyRoom],
  );

  const actionOptions = useMemo<SelectOption[]>(() => {
    if (!actionsRoom) {
      return [];
    }

    const options: SelectOption[] = [
      {
        key: 'details',
        label: 'View Details',
        icon: 'eye',
        onSelect: () => openDetails(actionsRoom),
      },
    ];

    if (canUpdate) {
      options.push({
        key: 'edit',
        label: 'Edit Room',
        icon: 'edit',
        onSelect: () => openForm('edit', actionsRoom),
      });
    }

    if (canDelete && roomStatusOf(actionsRoom) === 'Occupied') {
      options.push({
        key: 'release',
        label: 'Update to Available',
        icon: 'userMinus',
        destructive: true,
        onSelect: () => setPendingRelease(actionsRoom),
      });
    }

    return options;
  }, [actionsRoom, canUpdate, canDelete, openDetails, openForm]);

  const columns = useMemo<TableColumn<RoomModel>[]>(() => {
    const list: TableColumn<RoomModel>[] = [
      {
        key: 'room',
        header: 'Room No.',
        width: 128,
        render: (row) => (
          <View style={styles.roomCell}>
            <View style={styles.roomBadge}>
              <Text style={styles.roomBadgeText}>{roomShortLabel(row)}</Text>
            </View>
            <View style={styles.roomCellText}>
              <Text style={styles.roomLabel} numberOfLines={1}>
                {roomLabel(row)}
              </Text>
              <Text style={styles.roomCaption} numberOfLines={1}>
                {buildingLabel(row.building)}
              </Text>
            </View>
          </View>
        ),
      },
    ];

    if (tableWidth >= TOTAL_TENANT_COLUMN_WIDTH) {
      list.push({
        key: 'totalTenant',
        header: 'Total Tenant',
        width: 104,
        render: (row) => (
          <View>
            <Text style={styles.tenantCount}>{row.tenants.length}</Text>
            <Text style={styles.roomCaption} numberOfLines={1}>
              of {row.capacity} slots
            </Text>
          </View>
        ),
      });
    }

    list.push({
      key: 'tenants',
      header: 'Tenants',
      render: (row) => <TenantStack room={row} />,
    });

    if (tableWidth >= DUE_COLUMN_WIDTH) {
      list.push({
        key: 'due',
        header: 'Billing',
        width: 130,
        render: (row) => (
          <Text style={styles.dueText} numberOfLines={1}>
            {dueSummaryOf(row)}
          </Text>
        ),
      });
    }

    list.push(
      {
        key: 'status',
        header: 'Room Status',
        width: 124,
        render: (row) => <StatusChip status={roomStatusOf(row)} />,
      },
      {
        key: 'rate',
        header: 'Room Rates',
        width: 118,
        render: (row) => (
          <View>
            <Text style={styles.rateText} numberOfLines={1}>
              {formatPeso(row.rate)}
            </Text>
            <Text style={styles.roomCaption} numberOfLines={1}>
              per month
            </Text>
          </View>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: 62,
        align: 'right',
        render: (row) => <RowActionsButton room={row} onOpen={(anchor) => openActions(row, anchor)} />,
      },
    );

    return list;
  }, [tableWidth, openActions]);

  return (
    <View style={styles.page}>
      <MainContentArea>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Room Management</Text>
            <Text style={styles.subtitle}>
              {readOnly
                ? 'Viewing rooms, tenants, and monthly rates (read-only).'
                : 'Manage room occupancy, renters, and monthly rates.'}
            </Text>
          </View>
          {!compact && canCreate && (
            <GradientButton
              accessibilityLabel="Add new renters"
              style={styles.addButton}
              onPress={() => openForm('create', null)}>
              <AppIcon name="userPlus" size={15} tintColor={DefaultTheme.colors.white} />
              <Text style={styles.addButtonLabel}>Add New Renters</Text>
            </GradientButton>
          )}
        </View>

        <KPICardsRow>
          <KPICard
            label="Total Rooms"
            value={totalRooms}
            icon="rooms"
            iconColor={DefaultTheme.colors.primary}
            iconBackground={DefaultTheme.colors.softOlive}
            accentColor={DefaultTheme.colors.primary}
            caption="Bldg. A and Bldg. B"
            progress={1}
          />
          <KPICard
            label="Occupied Rooms"
            value={occupiedRooms}
            icon="rooms"
            iconColor={OCCUPIED_COLOR}
            iconBackground={DefaultTheme.colors.softBlue}
            accentColor={OCCUPIED_COLOR}
            caption={`${occupancyRate}% occupancy rate`}
            progress={totalRooms === 0 ? 0 : occupiedRooms / totalRooms}
          />
          <KPICard
            label="Available Rooms"
            value={availableRooms}
            icon="doorOpen"
            iconColor={AVAILABLE_COLOR}
            iconBackground="#E4F5EA"
            accentColor={AVAILABLE_COLOR}
            caption="Ready for new renters"
            progress={totalRooms === 0 ? 0 : availableRooms / totalRooms}
          />
          <KPICard
            label="Total Tenants"
            value={totalTenants}
            icon="users"
            iconColor={TENANT_COLOR}
            iconBackground="#EDE7F6"
            accentColor={TENANT_COLOR}
            caption={`${totalCapacity - totalTenants} free bed slots`}
            progress={totalCapacity === 0 ? 0 : totalTenants / totalCapacity}
          />
          <KPICard
            label="Due Payments Today"
            value={dueTodayCount}
            icon="payment"
            iconColor={DUE_TODAY_COLOR}
            iconBackground={DefaultTheme.colors.softGold}
            accentColor={DUE_TODAY_COLOR}
            caption="Requires immediate action"
            progress={occupiedRooms === 0 ? 0 : dueTodayCount / occupiedRooms}
          />
          <KPICard
            label="Due This Week"
            value={dueThisWeekCount}
            icon="calendar"
            iconColor={DUE_WEEK_COLOR}
            iconBackground="#FBE7E5"
            accentColor={DUE_WEEK_COLOR}
            caption="Upcoming collections"
            progress={occupiedRooms === 0 ? 0 : dueThisWeekCount / occupiedRooms}
          />
        </KPICardsRow>

        <Card style={styles.tableCard} revealDelay={320}>
          {(notice || actionError || loadError) && (
            <Banner
              tone={actionError || loadError ? 'error' : 'success'}
              message={actionError ?? loadError ?? notice ?? ''}
              onDismiss={() => {
                setNotice(null);
                setActionError(null);
                setLoadError(null);
              }}
            />
          )}

          <View style={styles.toolbar}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search by room or tenant…"
              style={styles.search}
            />
            <FilterSelect
              label={statusFilter === 'All' ? 'All Status' : statusFilter}
              accessibilityLabel="Filter by room status"
              options={['All', 'Occupied', 'Available'] as StatusFilter[]}
              value={statusFilter}
              labelOf={(option) => (option === 'All' ? 'All Status' : option)}
              onChange={setStatusFilter}
              style={compact ? styles.filterCompact : undefined}
            />
            <FilterSelect
              label={buildingFilter === 'All' ? 'All Buildings' : buildingLabel(buildingFilter)}
              accessibilityLabel="Filter by building"
              options={['All', ...roomBuildings] as BuildingFilter[]}
              value={buildingFilter}
              labelOf={(option) => (option === 'All' ? 'All Buildings' : buildingLabel(option))}
              onChange={setBuildingFilter}
              style={compact ? styles.filterCompact : undefined}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh rooms"
              style={styles.refreshButton}
              onPress={load}>
              <AppIcon name="refresh" size={15} tintColor={DefaultTheme.colors.muted} />
            </Pressable>
          </View>

          <View onLayout={handleTableLayout}>
            {loading && rooms.length === 0 ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator color={DefaultTheme.colors.primary} />
                <Text style={styles.loadingText}>Loading rooms…</Text>
              </View>
            ) : compact ? (
              <View style={styles.mobileList}>
                {filtered.length === 0 ? (
                  <Text style={styles.emptyText}>No rooms match your filters.</Text>
                ) : (
                  filtered.map((room) => (
                    <RoomListCard
                      key={room.id}
                      room={room}
                      onPress={() => openDetails(room)}
                      onOpenActions={(anchor) => openActions(room, anchor)}
                    />
                  ))
                )}
              </View>
            ) : (
              <Table
                columns={columns}
                data={filtered}
                keyExtractor={(row) => row.id}
                emptyLabel="No rooms match your filters."
              />
            )}
          </View>

          {!loading && filtered.length > 0 && (
            <Text style={styles.footerSummary}>
              Showing {filtered.length} of {totalRooms} rooms · {totalTenants} tenants ·{' '}
              {occupancyRate}% occupied
            </Text>
          )}
        </Card>
      </MainContentArea>

      {compact && canCreate && (
        <GradientButton
          variant="fab"
          accessibilityLabel="Add new renters"
          style={{ bottom: Math.max(safeAreaBottom, 10) + 82 }}
          onPress={() => openForm('create', null)}>
          <AppIcon name="userPlus" size={22} tintColor={DefaultTheme.colors.white} />
        </GradientButton>
      )}

      <Select
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        options={actionOptions}
        anchor={actionsAnchor}
        align="right"
        minWidth={198}
      />

      <CreateUpdateRoomModal
        key={formSession}
        visible={formOpen}
        mode={formMode}
        room={formRoom}
        rooms={rooms}
        onClose={() => setFormOpen(false)}
        onSubmit={formMode === 'create' ? handleCreate : handleUpdate}
      />

      <RoomDetailsModal
        visible={detailsOpen}
        room={detailsRoom}
        canEdit={canUpdate}
        onEdit={(room) => {
          setDetailsOpen(false);
          openForm('edit', room);
        }}
        onClose={() => setDetailsOpen(false)}
      />

      <ConfirmDialog
        visible={pendingRelease !== null}
        icon="userMinus"
        tone="destructive"
        title="Update room to available?"
        message={`${
          pendingRelease ? roomLabel(pendingRelease) : 'This room'
        } will be marked as available and its ${
          pendingRelease?.tenants.length ?? 0
        } tenant(s) will be removed from the room.`}
        confirmLabel="Update to Available"
        onConfirm={() => {
          if (pendingRelease) {
            handleRelease(pendingRelease);
          }
        }}
        onClose={() => setPendingRelease(null)}
      />
    </View>
  );
}

function Banner({
  tone,
  message,
  onDismiss,
}: {
  tone: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}) {
  const error = tone === 'error';

  return (
    <View style={[styles.banner, error ? styles.bannerError : styles.bannerSuccess]}>
      <AppIcon
        name={error ? 'warning' : 'check'}
        size={15}
        tintColor={error ? '#C4453B' : DefaultTheme.colors.primary}
      />
      <Text style={[styles.bannerText, error && styles.bannerTextError]}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        hitSlop={8}
        onPress={onDismiss}>
        <AppIcon name="close" size={13} tintColor={DefaultTheme.colors.muted} />
      </Pressable>
    </View>
  );
}

function StatusChip({ status }: { status: RoomStatus }) {
  const tone = statusTone[status];

  return (
    <View style={[styles.statusChip, { backgroundColor: tone.background }]}>
      <View style={[styles.statusDot, { backgroundColor: tone.color }]} />
      <Text style={[styles.statusChipText, { color: tone.color }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
}

function TenantStack({ room, limit }: { room: RoomModel; limit?: number }) {
  if (room.tenants.length === 0) {
    return <Text style={styles.noTenants}>No tenants yet</Text>;
  }

  const visible = limit ? room.tenants.slice(0, limit) : room.tenants;
  const hidden = room.tenants.length - visible.length;

  return (
    <View style={styles.tenantStack}>
      {visible.map((tenant) => (
        <Text key={tenant.id} style={styles.tenantName} numberOfLines={1}>
          {tenant.fullName}
        </Text>
      ))}
      {hidden > 0 && <Text style={styles.tenantMore}>+{hidden} more</Text>}
    </View>
  );
}

function RowActionsButton({
  room,
  onOpen,
}: {
  room: RoomModel;
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
      accessibilityLabel={`Actions for ${roomLabel(room)}`}
      style={[styles.rowAction, hovered && styles.rowActionHovered]}
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      <AppIcon name="more" size={16} tintColor={DefaultTheme.colors.muted} />
    </Pressable>
  );
}

function FilterSelect<T extends string>({
  label,
  accessibilityLabel,
  options,
  value,
  labelOf,
  onChange,
  style,
}: {
  label: string;
  accessibilityLabel: string;
  options: T[];
  value: T;
  labelOf: (option: T) => string;
  onChange: (option: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const selectOptions = useMemo<SelectOption[]>(
    () =>
      options.map((option) => ({
        key: option,
        label: labelOf(option),
        icon: option === value ? 'check' : undefined,
        onSelect: () => onChange(option),
      })),
    [options, value, labelOf, onChange],
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
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        style={[styles.filterTrigger, (hovered || open) && styles.filterTriggerActive]}
        onPress={handlePress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}>
        <Text style={styles.filterTriggerLabel} numberOfLines={1}>
          {label}
        </Text>
        <AppIcon
          name="chevronDown"
          size={13}
          tintColor={DefaultTheme.colors.muted}
          style={open ? styles.chevronOpen : undefined}
        />
      </Pressable>
      <Select
        visible={open}
        onClose={() => setOpen(false)}
        options={selectOptions}
        anchor={anchor}
        align="right"
        minWidth={172}
      />
    </View>
  );
}

function RoomListCard({
  room,
  onPress,
  onOpenActions,
}: {
  room: RoomModel;
  onPress: () => void;
  onOpenActions: (anchor: SelectAnchor) => void;
}) {
  const status = roomStatusOf(room);
  const free = remainingCapacityOf(room);

  return (
    <View style={styles.mobileCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${roomLabel(room)}`}
        style={styles.mobileCardPressable}
        onPress={onPress}>
        <View style={styles.mobileCardHeader}>
          <View style={styles.roomBadge}>
            <Text style={styles.roomBadgeText}>{roomShortLabel(room)}</Text>
          </View>
          <View style={styles.mobileCardHeaderText}>
            <Text style={styles.roomLabel} numberOfLines={1}>
              {roomLabel(room)}
            </Text>
            <Text style={styles.roomCaption} numberOfLines={1}>
              {buildingLabel(room.building)} · {dueSummaryOf(room)}
            </Text>
          </View>
        </View>

        <View style={styles.mobileMetaRow}>
          <StatusChip status={status} />
          <View style={styles.mobileMetaItem}>
            <AppIcon name="users" size={12} tintColor={DefaultTheme.colors.muted} />
            <Text style={styles.mobileMetaText}>
              {room.tenants.length}/{room.capacity} tenants
            </Text>
          </View>
          <View style={styles.mobileMetaItem}>
            <AppIcon name="money" size={12} tintColor={DefaultTheme.colors.muted} />
            <Text style={styles.mobileMetaText}>{formatPeso(room.rate)}</Text>
          </View>
        </View>

        <View style={styles.mobileTenants}>
          <Text style={styles.mobileSectionLabel}>Tenants</Text>
          <TenantStack room={room} limit={MOBILE_TENANT_PREVIEW} />
        </View>

        {free > 0 && status === 'Occupied' && (
          <Text style={styles.mobileFootnote}>{free} bed slot(s) still open</Text>
        )}
      </Pressable>

      <View style={styles.mobileCardActions}>
        <RowActionsButton room={room} onOpen={onOpenActions} />
      </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: DefaultTheme.colors.softOlive,
    borderColor: 'rgba(138, 153, 0, 0.28)',
  },
  bannerError: {
    backgroundColor: '#FBE7E5',
    borderColor: 'rgba(196, 69, 59, 0.28)',
  },
  bannerText: {
    flex: 1,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 18,
  },
  bannerTextError: {
    color: '#8C2F27',
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
  filterCompact: {
    flexGrow: 1,
    flexBasis: 148,
  },
  filterTrigger: {
    height: 42,
    minWidth: 148,
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
  filterTriggerActive: {
    borderColor: DefaultTheme.colors.primary,
    backgroundColor: DefaultTheme.colors.white,
  },
  filterTriggerLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  refreshButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  loadingBlock: {
    paddingVertical: 34,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
  roomCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  roomBadge: {
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  roomBadgeText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  roomCellText: {
    flexShrink: 1,
    minWidth: 0,
  },
  roomLabel: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  roomCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  tenantCount: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  tenantStack: {
    gap: 3,
    minWidth: 0,
  },
  tenantName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  tenantMore: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11.5,
  },
  noTenants: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  dueText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  rateText: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DefaultTheme.radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10.5,
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
    gap: 12,
  },
  mobileCard: {
    position: 'relative',
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.background,
  },
  mobileCardPressable: {
    padding: 14,
    gap: 12,
  },
  mobileCardActions: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 40,
  },
  mobileCardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  mobileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  mobileMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mobileMetaText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11.5,
  },
  mobileTenants: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DefaultTheme.colors.line,
  },
  mobileSectionLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mobileFootnote: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11.5,
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
  footerSummary: {
    marginTop: 14,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
});
