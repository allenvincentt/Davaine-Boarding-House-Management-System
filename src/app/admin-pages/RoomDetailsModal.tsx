import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { AppIconName } from '@/constants/icons';
import {
  buildingLabel,
  dueSummaryOf,
  formatPeso,
  formatShortDate,
  nextDueDate,
  remainingCapacityOf,
  roomLabel,
  roomShortLabel,
  roomStatusOf,
  type RoomModel,
  type RoomTenantModel,
} from '@/models/roomModel';

type RoomDetailsModalProps = {
  visible: boolean;
  room: RoomModel | null;
  canEdit: boolean;
  onEdit: (room: RoomModel) => void;
  onClose: () => void;
};

const statusTone = {
  Occupied: { color: '#4EA4E5', background: DefaultTheme.colors.softBlue },
  Available: { color: '#2E8A57', background: '#E4F5EA' },
};

function initialsOf(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const source = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
  return source.toUpperCase();
}

function openExternal(url: string) {
  Linking.openURL(url).catch(() => undefined);
}

export function RoomDetailsModal({
  visible,
  room,
  canEdit,
  onEdit,
  onClose,
}: RoomDetailsModalProps) {
  if (!room) {
    return null;
  }

  const status = roomStatusOf(room);
  const tone = statusTone[status];

  return (
    <Modal visible={visible} onClose={onClose} contentStyle={styles.shell}>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.roomBadge}>
            <Text style={styles.roomBadgeText}>{roomShortLabel(room)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {roomLabel(room)}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {buildingLabel(room.building)} · {dueSummaryOf(room)}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: tone.background }]}>
            <Text style={[styles.statusChipText, { color: tone.color }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatBlock icon="money" label="Room Rate" value={formatPeso(room.rate)} />
          <StatBlock
            icon="users"
            label="Occupancy"
            value={`${room.tenants.length} / ${room.capacity}`}
          />
          <StatBlock
            icon="doorOpen"
            label="Free Slots"
            value={`${remainingCapacityOf(room)} left`}
          />
          <StatBlock
            icon="calendar"
            label="Next Due"
            value={status === 'Occupied' ? formatShortDate(nextDueDate(room)) : '—'}
          />
        </View>

        <View style={styles.tenantsHeader}>
          <Text style={styles.sectionTitle}>Tenants</Text>
          <Text style={styles.sectionCount}>{room.tenants.length}</Text>
        </View>

        {room.tenants.length === 0 ? (
          <View style={styles.emptyBlock}>
            <AppIcon name="inbox" size={20} tintColor={DefaultTheme.colors.muted} />
            <Text style={styles.emptyText}>This room is available for new renters.</Text>
          </View>
        ) : (
          <View style={styles.tenantList}>
            {room.tenants.map((tenant, index) => (
              <TenantRow
                key={tenant.id}
                tenant={tenant}
                isLast={index === room.tenants.length - 1}
              />
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <MatchaButton label="Close" variant="outline" style={styles.action} onPress={onClose} />
          {canEdit && (
            <MatchaButton
              label="Edit Room"
              icon="edit"
              style={styles.action}
              onPress={() => onEdit(room)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function StatBlock({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <View style={styles.statLabelRow}>
        <AppIcon name={icon} size={13} tintColor={DefaultTheme.colors.muted} />
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TenantRow({ tenant, isLast }: { tenant: RoomTenantModel; isLast: boolean }) {
  return (
    <View style={[styles.tenantRow, isLast && styles.tenantRowLast]}>
      <View style={styles.tenantAvatar}>
        <Text style={styles.tenantAvatarText}>{initialsOf(tenant.fullName)}</Text>
      </View>
      <View style={styles.tenantBody}>
        <Text style={styles.tenantName} numberOfLines={1}>
          {tenant.fullName}
        </Text>
        <Text style={styles.tenantMeta} numberOfLines={1}>
          {tenant.contactNumber ?? 'No contact number'}
        </Text>
      </View>
      <View style={styles.tenantLinks}>
        {!!tenant.contactNumber && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${tenant.fullName}`}
            hitSlop={6}
            style={styles.tenantLinkButton}
            onPress={() => openExternal(`tel:${tenant.contactNumber?.replace(/\s/g, '')}`)}>
            <AppIcon name="phone" size={14} tintColor={DefaultTheme.colors.primary} />
          </Pressable>
        )}
        {!!tenant.facebookLink && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open Facebook profile of ${tenant.fullName}`}
            hitSlop={6}
            style={styles.tenantLinkButton}
            onPress={() => {
              const link = tenant.facebookLink ?? '';
              openExternal(
                link.startsWith('@') ? `https://facebook.com/${link.slice(1)}` : link,
              );
            }}>
            <AppIcon name="link" size={14} tintColor={DefaultTheme.colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    maxWidth: 480,
  },
  body: {
    padding: DefaultTheme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomBadge: {
    width: 48,
    height: 48,
    borderRadius: DefaultTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  roomBadgeText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 17,
  },
  subtitle: {
    marginTop: 3,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DefaultTheme.radius.pill,
  },
  statusChipText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10.5,
  },
  statGrid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBlock: {
    flexGrow: 1,
    flexBasis: 110,
    minWidth: 100,
    padding: 12,
    borderRadius: DefaultTheme.radius.sm,
    backgroundColor: DefaultTheme.colors.background,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    flexShrink: 1,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  statValue: {
    marginTop: 6,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  tenantsHeader: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.cool,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11,
  },
  tenantList: {
    marginTop: 6,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  tenantRowLast: {
    borderBottomWidth: 0,
  },
  tenantAvatar: {
    width: 36,
    height: 36,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.primary,
  },
  tenantAvatarText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  tenantBody: {
    flex: 1,
    minWidth: 0,
  },
  tenantName: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  tenantMeta: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  tenantLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  tenantLinkButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  emptyBlock: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.background,
  },
  emptyText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});
