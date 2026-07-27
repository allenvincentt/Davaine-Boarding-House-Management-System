import { useLocalSearchParams } from 'expo-router';
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

import { MainContentArea } from '@/components/layout/MainContentArea';
import { AppIcon } from '@/components/ui/AppIcon';
import { PageFabStack, usePageScrollNavigator } from '@/components/ui/buttons/PageFabStack';
import { Card } from '@/components/ui/cards/Card';
import { KPICard, KPICardsRow } from '@/components/ui/cards/KPICards';
import { SearchField } from '@/components/ui/SearchField';
import { Select, type SelectAnchor, type SelectOption } from '@/components/ui/Select';
import { Table, type TableColumn } from '@/components/ui/Table';
import { DefaultTheme } from '@/constants/defaultTheme';
import { buildingToneOf } from '@/constants/roomTheme';
import {
  ratingLabelOf,
  reviewDateLabel,
  reviewStatuses,
  reviewSummaryOf,
  starRow,
  type ReviewStatus,
  type RoomReviewModel,
} from '@/models/contentModel';
import {
  buildingLabel,
  roomLabel,
  sortRooms,
  type RoomBuilding,
  type RoomModel,
} from '@/models/roomModel';
import { useAuth } from '@/providers/AuthProvider';
import { can } from '@/services/accessControl';
import { listRoomReviews, updateReviewStatus } from '@/services/feedbackService';
import { listRooms } from '@/services/roomManagementService';

type StatusFilter = 'All' | ReviewStatus;

type RoomTag = {
  label: string;
  building: RoomBuilding | null;
};

const statusTone: Record<ReviewStatus, { color: string; background: string }> = {
  Pending: { color: '#C98A1E', background: DefaultTheme.colors.softGold },
  Approved: { color: '#2E8A57', background: '#E4F5EA' },
  Disapproved: { color: '#C4453B', background: '#FBE7E5' },
};

const POSITIVE_COLOR = '#2E8A57';
const NEGATIVE_COLOR = '#C4453B';
const COMMENT_COLUMN_WIDTH = 720;
const HIGHLIGHT_DURATION = 6000;

export default function FeedbackPage() {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const { profile } = useAuth();
  const scrollNavigator = usePageScrollNavigator();
  const params = useLocalSearchParams<{ review?: string }>();

  const role = profile?.userRole ?? null;
  const canModerate = can(role, 'update', 'feedback');

  const [reviews, setReviews] = useState<RoomReviewModel[]>([]);
  const [rooms, setRooms] = useState<RoomModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [tableWidth, setTableWidth] = useState(0);

  const [actionsReview, setActionsReview] = useState<RoomReviewModel | null>(null);
  const [actionsAnchor, setActionsAnchor] = useState<SelectAnchor | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const [highlightId, setHighlightId] = useState<string | null>(null);

  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const requestedReview = typeof params.review === 'string' ? params.review : null;

  useEffect(() => {
    if (!requestedReview) {
      setHighlightId(null);
      return;
    }

    setHighlightId(requestedReview);
    setQuery('');
    setStatusFilter('All');

    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_DURATION);
    return () => clearTimeout(timer);
  }, [requestedReview]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [reviewRows, roomRows] = await Promise.all([listRoomReviews(), listRooms()]);
      if (activeRef.current) {
        setReviews(reviewRows);
        setRooms(sortRooms(roomRows));
      }
    } catch (error) {
      if (activeRef.current) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load feedback.');
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

  const roomTags = useMemo(() => {
    const map = new Map<string, RoomTag>();
    rooms.forEach((room) => {
      map.set(room.id, { label: roomLabel(room), building: room.building });
    });
    return map;
  }, [rooms]);

  const tagOf = useCallback(
    (roomId: string): RoomTag => roomTags.get(roomId) ?? { label: roomId, building: null },
    [roomTags],
  );

  const summary = useMemo(() => reviewSummaryOf(reviews), [reviews]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reviews.filter((review) => {
      if (statusFilter !== 'All' && review.status !== statusFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        review.comment.toLowerCase().includes(term) ||
        tagOf(review.roomId).label.toLowerCase().includes(term)
      );
    });
  }, [reviews, query, statusFilter, tagOf]);

  const handleTableLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    setTableWidth((current) => (current === measured ? current : measured));
  }, []);

  const openActions = useCallback((review: RoomReviewModel, anchor: SelectAnchor) => {
    setActionsReview(review);
    setActionsAnchor(anchor);
    setActionsOpen(true);
  }, []);

  const handleStatusChange = useCallback(
    async (review: RoomReviewModel, status: ReviewStatus) => {
      setNotice(null);
      setActionError(null);
      try {
        const updated = await updateReviewStatus(review.id, status);
        setReviews((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setNotice(`The review for ${tagOf(review.roomId).label} was marked ${status}.`);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'The review could not be updated.',
        );
      }
    },
    [tagOf],
  );

  const actionOptions = useMemo<SelectOption[]>(() => {
    if (!actionsReview || !canModerate) {
      return [];
    }

    return [
      {
        key: 'approve',
        label: 'Approved',
        icon: 'check',
        onSelect: () => handleStatusChange(actionsReview, 'Approved'),
      },
      {
        key: 'disapprove',
        label: 'Disapproved',
        icon: 'close',
        destructive: true,
        onSelect: () => handleStatusChange(actionsReview, 'Disapproved'),
      },
    ];
  }, [actionsReview, canModerate, handleStatusChange]);

  const columns = useMemo<TableColumn<RoomReviewModel>[]>(() => {
    const list: TableColumn<RoomReviewModel>[] = [
      {
        key: 'date',
        header: 'Date',
        width: 132,
        render: (row) => (
          <View style={styles.dateCell}>
            <Text style={styles.dateText} numberOfLines={1}>
              {reviewDateLabel(row.createdAt)}
            </Text>
            <StatusBadge status={row.status} />
          </View>
        ),
      },
      {
        key: 'room',
        header: 'Room # and Building',
        width: 176,
        render: (row) => <RoomTagCell tag={tagOf(row.roomId)} />,
      },
    ];

    if (tableWidth >= COMMENT_COLUMN_WIDTH) {
      list.push({
        key: 'comment',
        header: 'Comment',
        render: (row) => (
          <Text style={styles.commentText} numberOfLines={2}>
            {row.comment.trim().length > 0 ? row.comment : 'No comment left.'}
          </Text>
        ),
      });
    }

    list.push({
      key: 'rating',
      header: 'Rating',
      width: 116,
      render: (row) => <RatingCell rating={row.rating} />,
    });

    if (canModerate) {
      list.push({
        key: 'actions',
        header: 'Actions',
        width: 62,
        align: 'right',
        render: (row) => (
          <RowActionsButton
            label={tagOf(row.roomId).label}
            onOpen={(anchor) => openActions(row, anchor)}
          />
        ),
      });
    }

    return list;
  }, [tableWidth, tagOf, canModerate, openActions]);

  return (
    <View style={styles.page}>
      <MainContentArea {...scrollNavigator.scrollProps}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Feedback</Text>
            <Text style={styles.subtitle}>
              {canModerate
                ? 'Review anonymous room ratings and choose what shows on the website.'
                : 'Viewing anonymous room ratings and comments (read-only).'}
            </Text>
          </View>
        </View>

        <KPICardsRow>
          <KPICard
            label="Average Rating"
            value={ratingLabelOf(summary.average)}
            icon="chart"
            iconColor="#C98A1E"
            iconBackground={DefaultTheme.colors.softGold}
            accentColor="#C98A1E"
            caption={starRow(summary.average)}
            progress={summary.average / 5}
          />
          <KPICard
            label="Total Responses"
            value={summary.total}
            icon="feedback"
            iconColor={DefaultTheme.colors.primary}
            iconBackground={DefaultTheme.colors.softOlive}
            accentColor={DefaultTheme.colors.primary}
            caption="All submitted reviews"
            progress={1}
          />
          <KPICard
            label="Total Positive Rating"
            value={summary.positive}
            icon="trendUp"
            iconColor={POSITIVE_COLOR}
            iconBackground="#E4F5EA"
            accentColor={POSITIVE_COLOR}
            caption="4 and 5 star reviews"
            progress={summary.total === 0 ? 0 : summary.positive / summary.total}
          />
          <KPICard
            label="Total Negative Rating"
            value={summary.negative}
            icon="trendDown"
            iconColor={NEGATIVE_COLOR}
            iconBackground="#FBE7E5"
            accentColor={NEGATIVE_COLOR}
            caption="1 and 2 star reviews"
            progress={summary.total === 0 ? 0 : summary.negative / summary.total}
          />
        </KPICardsRow>

        <Card style={styles.tableCard} revealDelay={320} {...scrollNavigator.targetProps}>
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
              placeholder="Search a room or a comment…"
              style={styles.search}
            />
            <StatusFilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              style={compact && styles.filterCompact}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh feedback"
              style={styles.refreshButton}
              onPress={load}>
              <AppIcon name="refresh" size={15} tintColor={DefaultTheme.colors.muted} />
            </Pressable>
          </View>

          <View onLayout={handleTableLayout}>
            {loading && reviews.length === 0 ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator color={DefaultTheme.colors.primary} />
                <Text style={styles.loadingText}>Loading feedback…</Text>
              </View>
            ) : compact ? (
              <View style={styles.mobileList}>
                {filtered.length === 0 ? (
                  <Text style={styles.emptyText}>No reviews match your filters.</Text>
                ) : (
                  filtered.map((review, index) => (
                    <ReviewListItem
                      key={review.id}
                      review={review}
                      tag={tagOf(review.roomId)}
                      isLast={index === filtered.length - 1}
                      highlighted={review.id === highlightId}
                      showActions={canModerate}
                      onOpenActions={(anchor) => openActions(review, anchor)}
                    />
                  ))
                )}
              </View>
            ) : (
              <Table
                columns={columns}
                data={filtered}
                keyExtractor={(row) => row.id}
                emptyLabel="No reviews match your filters."
                highlightKey={highlightId}
              />
            )}
          </View>
        </Card>
      </MainContentArea>

      {compact && <PageFabStack navigator={scrollNavigator} downLabel="To Reviews" />}

      <Select
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        options={actionOptions}
        anchor={actionsAnchor}
        align="right"
        minWidth={186}
      />
    </View>
  );
}

function BuildingChip({ building }: { building: RoomBuilding }) {
  const tone = buildingToneOf(building);

  return (
    <View
      style={[
        styles.buildingChip,
        { backgroundColor: tone.background, borderColor: tone.border },
      ]}>
      <Text style={[styles.buildingChipText, { color: tone.color }]} numberOfLines={1}>
        {buildingLabel(building)}
      </Text>
    </View>
  );
}

function RoomTagCell({ tag }: { tag: RoomTag }) {
  return (
    <View style={styles.roomCell}>
      <Text style={styles.roomText} numberOfLines={1}>
        {tag.label}
      </Text>
      {tag.building && <BuildingChip building={tag.building} />}
    </View>
  );
}

function RatingCell({ rating }: { rating: number }) {
  return (
    <View style={styles.ratingCell}>
      <Text style={styles.ratingStars} numberOfLines={1}>
        {starRow(rating)}
      </Text>
      <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const tone = statusTone[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: tone.background }]}>
      <Text style={[styles.statusBadgeText, { color: tone.color }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
}

function RowActionsButton({
  label,
  onOpen,
}: {
  label: string;
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
      accessibilityLabel={`Actions for the ${label} review`}
      style={[styles.rowAction, hovered && styles.rowActionHovered]}
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}>
      <AppIcon name="more" size={16} tintColor={DefaultTheme.colors.muted} />
    </Pressable>
  );
}

function StatusFilterSelect({
  value,
  onChange,
  style,
}: {
  value: StatusFilter;
  onChange: (status: StatusFilter) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<SelectAnchor | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const options = useMemo<SelectOption[]>(
    () =>
      (['All', ...reviewStatuses] as StatusFilter[]).map((status) => ({
        key: status,
        label: status === 'All' ? 'All Reviews' : status,
        icon: status === value ? 'check' : undefined,
        onSelect: () => onChange(status),
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
        accessibilityLabel="Filter by status"
        accessibilityState={{ expanded: open }}
        style={[styles.filterTrigger, (hovered || open) && styles.filterTriggerActive]}
        onPress={handlePress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}>
        <Text style={styles.filterTriggerLabel} numberOfLines={1}>
          {value === 'All' ? 'All Reviews' : value}
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

function ReviewListItem({
  review,
  tag,
  isLast,
  highlighted,
  showActions,
  onOpenActions,
}: {
  review: RoomReviewModel;
  tag: RoomTag;
  isLast: boolean;
  highlighted: boolean;
  showActions: boolean;
  onOpenActions: (anchor: SelectAnchor) => void;
}) {
  return (
    <View
      style={[
        styles.mobileRow,
        isLast && styles.mobileRowLast,
        highlighted && styles.mobileRowHighlighted,
      ]}>
      <View style={styles.mobileBody}>
        <View style={styles.mobileHeader}>
          <Text style={styles.roomText} numberOfLines={1}>
            {tag.label}
          </Text>
          <Text style={styles.dateText}>{reviewDateLabel(review.createdAt)}</Text>
        </View>
        <RatingCell rating={review.rating} />
        <Text style={styles.commentText}>
          {review.comment.trim().length > 0 ? review.comment : 'No comment left.'}
        </Text>
        <View style={styles.mobileMeta}>
          {tag.building && <BuildingChip building={tag.building} />}
          <StatusBadge status={review.status} />
        </View>
      </View>
      {showActions && <RowActionsButton label={tag.label} onOpen={onOpenActions} />}
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
    flexBasis: 152,
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
  filterTrigger: {
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
  dateCell: {
    gap: 5,
    minWidth: 0,
  },
  dateText: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DefaultTheme.radius.pill,
  },
  statusBadgeText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 9.5,
  },
  roomCell: {
    gap: 5,
    minWidth: 0,
  },
  roomText: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
  buildingChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: DefaultTheme.radius.pill,
    borderWidth: 1,
  },
  buildingChipText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10,
  },
  commentText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
  },
  ratingCell: {
    gap: 2,
    minWidth: 0,
  },
  ratingStars: {
    color: '#C98A1E',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  ratingValue: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
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
  mobileRowHighlighted: {
    paddingHorizontal: 12,
    marginHorizontal: -12,
    borderRadius: DefaultTheme.radius.sm,
    borderBottomColor: 'transparent',
    backgroundColor: DefaultTheme.colors.softGold,
  },
  mobileBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mobileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
});
