import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { buildingToneOf } from '@/constants/roomTheme';
import {
  ratingBreakdownOf,
  reviewDateLabel,
  type PublicRoomModel,
  type RoomReviewModel,
} from '@/models/contentModel';
import { buildingLabel } from '@/models/roomModel';

type RoomDetailsModalProps = {
  visible: boolean;
  room: PublicRoomModel | null;
  onClose: () => void;
  onInquire?: (room: PublicRoomModel) => void;
};

export function RoomDetailsModal({ visible, room, onClose, onInquire }: RoomDetailsModalProps) {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.tablet;
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    setSlide(0);
  }, [room?.roomId, visible]);

  if (!room) {
    return null;
  }

  const photoCount = room.photos.length;
  const activePhoto = room.photos[Math.min(slide, Math.max(photoCount - 1, 0))] ?? null;
  const tone = buildingToneOf(room.building);
  const breakdown = ratingBreakdownOf(room.reviews);

  const step = (direction: -1 | 1) => {
    if (photoCount === 0) {
      return;
    }
    setSlide((current) => (current + direction + photoCount) % photoCount);
  };

  return (
    <Modal visible={visible} onClose={onClose} contentStyle={styles.shell}>
      <View style={styles.body}>
        <View style={[styles.gallery, compact && styles.galleryCompact]}>
          {activePhoto ? (
            <Image source={{ uri: activePhoto.uri }} style={styles.galleryImage} resizeMode="cover" />
          ) : (
            <View style={styles.galleryEmpty}>
              <AppIcon name="rooms" size={26} tintColor={DefaultTheme.colors.muted} />
              <Text style={styles.galleryEmptyText}>No photos uploaded for this room yet.</Text>
            </View>
          )}

          {photoCount > 1 && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
                style={[styles.galleryArrow, styles.galleryArrowLeft]}
                onPress={() => step(-1)}>
                <AppIcon name="chevronLeft" size={16} tintColor={DefaultTheme.colors.ink} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next photo"
                style={[styles.galleryArrow, styles.galleryArrowRight]}
                onPress={() => step(1)}>
                <AppIcon name="chevronRight" size={16} tintColor={DefaultTheme.colors.ink} />
              </Pressable>
            </>
          )}

          <View style={[styles.statusChip, room.available ? styles.available : styles.occupied]}>
            <Text style={[styles.statusChipText, !room.available && styles.occupiedText]}>
              {room.status}
            </Text>
          </View>

          {photoCount > 1 && (
            <View style={styles.dots}>
              {room.photos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[styles.dot, index === slide % photoCount && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {photoCount > 1 && (
          <View style={styles.thumbRow}>
            {room.photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                accessibilityRole="button"
                accessibilityLabel={`Show photo ${index + 1} of ${photoCount}`}
                style={[styles.thumb, index === slide % photoCount && styles.thumbActive]}
                onPress={() => setSlide(index)}>
                <Image source={{ uri: photo.uri }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {room.headline}
            </Text>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.buildingChip,
                  { backgroundColor: tone.background, borderColor: tone.border },
                ]}>
                <Text style={[styles.buildingChipText, { color: tone.color }]}>
                  {buildingLabel(room.building)}
                </Text>
              </View>
              <Text style={styles.metaText}>{room.capacityLabel}</Text>
            </View>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>MONTHLY RATE</Text>
            <Text style={styles.price}>{room.rateLabel}</Text>
          </View>
        </View>

        {!!room.description && <Text style={styles.description}>{room.description}</Text>}

        {room.amenities.length > 0 && (
          <View style={styles.amenityRow}>
            {room.amenities.map((amenity) => (
              <View key={amenity} style={styles.amenityChip}>
                <AppIcon name="check" size={11} tintColor={DefaultTheme.colors.primary} />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Text style={styles.sectionCount}>{room.reviewCount}</Text>
        </View>

        <View style={[styles.scoreCard, compact && styles.scoreCardCompact]}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{room.ratingLabel}</Text>
            <Text style={styles.scoreStars}>{starRow(room.rating)}</Text>
            <Text style={styles.scoreCaption}>
              {room.reviewCount === 0
                ? 'No reviews yet'
                : `${room.reviewCount} review${room.reviewCount === 1 ? '' : 's'}`}
            </Text>
          </View>
          <View style={styles.breakdown}>
            {breakdown.map((row) => (
              <View key={row.star} style={styles.breakdownRow}>
                <Text style={styles.breakdownStar}>{row.star}★</Text>
                <View style={styles.breakdownTrack}>
                  <View style={[styles.breakdownFill, { width: `${Math.round(row.share * 100)}%` }]} />
                </View>
                <Text style={styles.breakdownCount}>{row.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {room.reviews.length === 0 ? (
          <View style={styles.emptyReviews}>
            <AppIcon name="feedback" size={20} tintColor={DefaultTheme.colors.muted} />
            <Text style={styles.emptyReviewsText}>
              Be the first to share how it feels to live in this room.
            </Text>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {room.reviews.map((review, index) => (
              <ReviewRow
                key={review.id}
                review={review}
                isLast={index === room.reviews.length - 1}
              />
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <MatchaButton label="Close" variant="outline" style={styles.action} onPress={onClose} />
          {room.available && (
            <MatchaButton
              label="Inquire Now"
              icon="email"
              style={styles.action}
              onPress={() => onInquire?.(room)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function ReviewRow({ review, isLast }: { review: RoomReviewModel; isLast: boolean }) {
  return (
    <View style={[styles.reviewRow, isLast && styles.reviewRowLast]}>
      <View style={styles.reviewAvatar}>
        <Text style={styles.reviewAvatarText}>{initialsOf(review.author)}</Text>
      </View>
      <View style={styles.reviewBody}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewAuthor} numberOfLines={1}>
            {review.author}
          </Text>
          <Text style={styles.reviewDate}>{reviewDateLabel(review.createdAt)}</Text>
        </View>
        <Text style={styles.reviewStars}>{starRow(review.rating)}</Text>
        <Text style={styles.reviewComment}>{review.comment}</Text>
      </View>
    </View>
  );
}

function starRow(rating: number) {
  const filled = Math.round(rating);
  return `${'★'.repeat(filled)}${'☆'.repeat(Math.max(0, 5 - filled))}`;
}

function initialsOf(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const source = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
  return source.toUpperCase();
}

const styles = StyleSheet.create({
  shell: {
    maxWidth: 560,
  },
  body: {
    padding: DefaultTheme.spacing.lg,
  },
  gallery: {
    height: 268,
    borderRadius: DefaultTheme.radius.md,
    overflow: 'hidden',
    backgroundColor: '#E5E4DB',
  },
  galleryCompact: {
    height: 214,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryEmpty: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  galleryEmptyText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  galleryArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  galleryArrowLeft: {
    left: 12,
  },
  galleryArrowRight: {
    right: 12,
  },
  statusChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: DefaultTheme.radius.pill,
  },
  available: {
    backgroundColor: DefaultTheme.colors.primary,
  },
  occupied: {
    backgroundColor: '#EFF0ED',
  },
  statusChipText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10,
  },
  occupiedText: {
    color: '#7D7E78',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    width: 18,
    backgroundColor: DefaultTheme.colors.white,
  },
  thumbRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumb: {
    width: 58,
    height: 44,
    borderRadius: DefaultTheme.radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#E5E4DB',
  },
  thumbActive: {
    borderColor: DefaultTheme.colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  headerRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 19,
  },
  metaRow: {
    marginTop: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  buildingChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: DefaultTheme.radius.pill,
    borderWidth: 1,
  },
  buildingChipText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10.5,
  },
  metaText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    color: '#777874',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  price: {
    marginTop: 2,
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 19,
  },
  description: {
    marginTop: 14,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  amenityRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  amenityText: {
    color: '#5F6A00',
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11,
  },
  reviewsHeader: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
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
  scoreCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 16,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  scoreCardCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  scoreBlock: {
    alignItems: 'center',
    minWidth: 92,
  },
  scoreValue: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 30,
  },
  scoreStars: {
    marginTop: 2,
    color: '#C98A1E',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  scoreCaption: {
    marginTop: 4,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  breakdown: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownStar: {
    width: 24,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10.5,
  },
  breakdownTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E2E4E7',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: DefaultTheme.colors.primary,
  },
  breakdownCount: {
    width: 18,
    textAlign: 'right',
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  emptyReviews: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  emptyReviewsText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  reviewList: {
    marginTop: 6,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  reviewRowLast: {
    borderBottomWidth: 0,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.primary,
  },
  reviewAvatarText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  reviewBody: {
    flex: 1,
    minWidth: 0,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewAuthor: {
    flex: 1,
    minWidth: 0,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
  },
  reviewDate: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  reviewStars: {
    marginTop: 3,
    color: '#C98A1E',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11.5,
  },
  reviewComment: {
    marginTop: 5,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
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
