import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { AppIcon } from "@/components/ui/AppIcon";
import { MatchaButton } from "@/components/ui/buttons/MatchaButton";
import { Modal } from "@/components/ui/modals/Modal";
import { DefaultTheme } from "@/constants/defaultTheme";
import { buildingToneOf } from "@/constants/roomTheme";
import {
  MAX_REVIEW_COMMENT,
  averageRatingOf,
  ratingBreakdownOf,
  reviewCountLabel,
  reviewDateLabel,
  starRow,
  type PublicRoomModel,
  type RoomReviewModel,
} from "@/models/contentModel";
import { buildingLabel } from "@/models/roomModel";
import {
  listApprovedRoomReviews,
  submitRoomReview,
} from "@/services/feedbackService";

type RoomDetailsModalProps = {
  visible: boolean;
  room: PublicRoomModel | null;
  onClose: () => void;
  onInquire?: (room: PublicRoomModel) => void;
};

const RATING_VALUES = [1, 2, 3, 4, 5];

export function RoomDetailsModal({
  visible,
  room,
  onClose,
  onInquire,
}: RoomDetailsModalProps) {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.tablet;
  const [slide, setSlide] = useState(0);

  const [composerOpen, setComposerOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [commentFocused, setCommentFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<RoomReviewModel[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const activeRef = useRef(true);

  const roomId = room?.roomId ?? null;

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    setSlide(0);
    setComposerOpen(false);
    setSubmitted(false);
    setRating(0);
    setComment("");
    setReviewError(null);
  }, [roomId, visible]);

  const loadReviews = useCallback(async () => {
    if (!roomId) {
      return;
    }

    setReviewsLoading(true);
    try {
      const rows = await listApprovedRoomReviews(roomId);
      if (activeRef.current) {
        setReviews(rows);
      }
    } catch {
      if (activeRef.current) {
        setReviews([]);
      }
    } finally {
      if (activeRef.current) {
        setReviewsLoading(false);
      }
    }
  }, [roomId]);

  useEffect(() => {
    if (!visible || !roomId) {
      return;
    }
    setReviews([]);
    loadReviews();
  }, [visible, roomId, loadReviews]);

  const average = useMemo(() => averageRatingOf(reviews), [reviews]);
  const breakdown = useMemo(() => ratingBreakdownOf(reviews), [reviews]);

  if (!room) {
    return null;
  }

  const photoCount = room.photos.length;
  const activePhoto =
    room.photos[Math.min(slide, Math.max(photoCount - 1, 0))] ?? null;
  const tone = buildingToneOf(room.building);

  const step = (direction: -1 | 1) => {
    if (photoCount === 0) {
      return;
    }
    setSlide((current) => (current + direction + photoCount) % photoCount);
  };

  const handleSubmitReview = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setReviewError(null);
    try {
      await submitRoomReview({ roomId: room.roomId, rating, comment });
      setSubmitted(true);
      setRating(0);
      setComment("");
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : "Your review could not be sent.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleInquire = () => {
    onClose();
    onInquire?.(room);
  };

  return (
    <Modal visible={visible} onClose={onClose} contentStyle={styles.shell}>
      <View style={styles.body}>
        <View style={[styles.gallery, compact && styles.galleryCompact]}>
          {activePhoto ? (
            <Image
              source={{ uri: activePhoto.uri }}
              style={styles.galleryImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.galleryEmpty}>
              <AppIcon
                name="rooms"
                size={26}
                tintColor={DefaultTheme.colors.muted}
              />
              <Text style={styles.galleryEmptyText}>
                No photos uploaded for this room yet.
              </Text>
            </View>
          )}

          {photoCount > 1 && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
                style={[styles.galleryArrow, styles.galleryArrowLeft]}
                onPress={() => step(-1)}
              >
                <AppIcon
                  name="chevronLeft"
                  size={16}
                  tintColor={DefaultTheme.colors.ink}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next photo"
                style={[styles.galleryArrow, styles.galleryArrowRight]}
                onPress={() => step(1)}
              >
                <AppIcon
                  name="chevronRight"
                  size={16}
                  tintColor={DefaultTheme.colors.ink}
                />
              </Pressable>
            </>
          )}

          <View
            style={[
              styles.statusChip,
              room.available ? styles.available : styles.occupied,
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                !room.available && styles.occupiedText,
              ]}
            >
              {room.status}
            </Text>
          </View>

          {photoCount > 1 && (
            <View style={styles.dots}>
              {room.photos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[
                    styles.dot,
                    index === slide % photoCount && styles.dotActive,
                  ]}
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
                style={[
                  styles.thumb,
                  index === slide % photoCount && styles.thumbActive,
                ]}
                onPress={() => setSlide(index)}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
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
                  {
                    backgroundColor: tone.background,
                    borderColor: tone.border,
                  },
                ]}
              >
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

        {!!room.description && (
          <Text style={styles.description}>{room.description}</Text>
        )}

        {room.amenities.length > 0 && (
          <View style={styles.amenityRow}>
            {room.amenities.map((amenity) => (
              <View key={amenity} style={styles.amenityChip}>
                <AppIcon
                  name="check"
                  size={11}
                  tintColor={DefaultTheme.colors.primary}
                />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.reviewPanel}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.reviewCountBadge}>
              <Text style={styles.reviewCountBadgeText}>{reviews.length}</Text>
            </View>
          </View>

          {reviewsLoading && reviews.length === 0 ? (
            <View style={styles.reviewsLoading}>
              <ActivityIndicator color={DefaultTheme.colors.primary} />
            </View>
          ) : reviews.length === 0 ? (
            <Text style={styles.reviewsEmpty}>
              No reviews for this room yet. Be the first to rate it.
            </Text>
          ) : (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryScore}>
                  <Text style={styles.summaryAverage}>{average.toFixed(1)}</Text>
                  <Text style={styles.summaryStars}>{starRow(average)}</Text>
                  <Text style={styles.summaryCount}>
                    {reviewCountLabel(reviews.length)}
                  </Text>
                </View>
                <View style={styles.breakdown}>
                  {breakdown.map((row) => (
                    <View key={row.value} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{row.value}★</Text>
                      <View style={styles.breakdownTrack}>
                        <View
                          style={[
                            styles.breakdownFill,
                            { width: `${Math.round(row.share * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.breakdownCount}>{row.count}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.reviewList}>
                {reviews.map((review, index) => (
                  <View
                    key={review.id}
                    style={[
                      styles.reviewItem,
                      index > 0 && styles.reviewItemDivided,
                    ]}
                  >
                    <View style={styles.reviewAvatar}>
                      <AppIcon
                        name="user"
                        size={16}
                        tintColor={DefaultTheme.colors.white}
                      />
                    </View>
                    <View style={styles.reviewItemBody}>
                      <View style={styles.reviewItemHeader}>
                        <Text style={styles.reviewAuthor} numberOfLines={1}>
                          Anonymous
                        </Text>
                        <Text style={styles.reviewDate}>
                          {reviewDateLabel(review.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.reviewItemStars}>
                        {starRow(review.rating)}
                      </Text>
                      {review.comment.trim().length > 0 && (
                        <Text style={styles.reviewComment}>
                          {review.comment}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionCaption}>
            Share how it feels to live here. Reviews are posted anonymously.
          </Text>

          {composerOpen ? (
            <View style={styles.composer}>
              {submitted ? (
                <View style={styles.composerSuccess}>
                  <Text style={styles.composerSuccessTitle}>Review submitted</Text>
                  <Text style={styles.composerSuccessText}>
                    Thanks for sharing. Your review will appear here once an
                    administrator approves it.
                  </Text>
                  <MatchaButton
                    label="Done"
                    variant="outline"
                    style={styles.composerSuccessAction}
                    onPress={() => {
                      setSubmitted(false);
                      setComposerOpen(false);
                    }}
                  />
                </View>
              ) : (
                <>
              <Text style={styles.composerLabel}>Your rating</Text>
              <View style={styles.starRow}>
                {RATING_VALUES.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: rating === value }}
                    accessibilityLabel={`${value} star${value === 1 ? "" : "s"}`}
                    hitSlop={4}
                    style={styles.starButton}
                    onPress={() => setRating(value)}
                  >
                    <Text
                      style={[
                        styles.star,
                        value <= rating && styles.starActive,
                      ]}
                    >
                      {value <= rating ? "★" : "☆"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.composerLabel}>Your comment (optional)</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                onFocus={() => setCommentFocused(true)}
                onBlur={() => setCommentFocused(false)}
                multiline
                maxLength={MAX_REVIEW_COMMENT}
                accessibilityLabel="Review comment"
                placeholder="What did you like about this room?"
                placeholderTextColor="#9A9B95"
                cursorColor={DefaultTheme.colors.primary}
                underlineColorAndroid="transparent"
                style={[
                  styles.commentInput,
                  commentFocused && styles.commentInputFocused,
                ]}
              />
              <Text style={styles.counter}>
                {comment.length}/{MAX_REVIEW_COMMENT}
              </Text>

              {!!reviewError && (
                <Text style={styles.reviewError}>{reviewError}</Text>
              )}

              <View style={styles.composerActions}>
                <MatchaButton
                  label="Cancel"
                  variant="outline"
                  disabled={submitting}
                  style={styles.composerAction}
                  onPress={() => {
                    setComposerOpen(false);
                    setReviewError(null);
                  }}
                />
                <MatchaButton
                  label={submitting ? "Sending…" : "Submit Review"}
                  disabled={submitting || rating === 0}
                  style={styles.composerAction}
                  onPress={handleSubmitReview}
                />
              </View>
                </>
              )}
            </View>
          ) : (
            <MatchaButton
              label="Add Review"
              icon="feedback"
              variant="outline"
              style={styles.addReviewButton}
              onPress={() => {
                setReviewError(null);
                setSubmitted(false);
                setComposerOpen(true);
              }}
            />
          )}
        </View>

        <View style={styles.actions}>
          <MatchaButton
            label="Close"
            variant="outline"
            style={styles.action}
            onPress={onClose}
          />
          <MatchaButton
            label="Inquire Now"
            icon="email"
            style={styles.action}
            onPress={handleInquire}
          />
        </View>
      </View>
    </Modal>
  );
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
    overflow: "hidden",
    backgroundColor: "#E5E4DB",
  },
  galleryCompact: {
    height: 214,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryEmpty: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  galleryEmptyText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  galleryArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  galleryArrowLeft: {
    left: 12,
  },
  galleryArrowRight: {
    right: 12,
  },
  statusChip: {
    position: "absolute",
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
    backgroundColor: "#EFF0ED",
  },
  statusChipText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10,
  },
  occupiedText: {
    color: "#7D7E78",
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: {
    width: 18,
    backgroundColor: DefaultTheme.colors.white,
  },
  thumbRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  thumb: {
    width: 58,
    height: 44,
    borderRadius: DefaultTheme.radius.sm,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#E5E4DB",
  },
  thumbActive: {
    borderColor: DefaultTheme.colors.primary,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  headerRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
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
    alignItems: "flex-end",
  },
  priceLabel: {
    color: "#777874",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  amenityText: {
    color: "#5F6A00",
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11,
  },
  reviewPanel: {
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: DefaultTheme.colors.line,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  reviewCountBadge: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DefaultTheme.colors.cool,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  reviewCountBadgeText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11,
  },
  reviewsLoading: {
    paddingVertical: 26,
    alignItems: "center",
  },
  reviewsEmpty: {
    marginTop: 14,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 18,
  },
  summaryCard: {
    marginTop: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    borderRadius: DefaultTheme.radius.md,
    backgroundColor: DefaultTheme.colors.cool,
  },
  summaryScore: {
    alignItems: "center",
    minWidth: 96,
  },
  summaryAverage: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 34,
    lineHeight: 40,
  },
  summaryStars: {
    marginTop: 2,
    color: "#C98A1E",
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13,
  },
  summaryCount: {
    marginTop: 5,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  breakdown: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  breakdownLabel: {
    width: 24,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11,
  },
  breakdownTrack: {
    flex: 1,
    height: 7,
    minWidth: 0,
    overflow: "hidden",
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: "#E1E2DC",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.primary,
  },
  breakdownCount: {
    minWidth: 14,
    textAlign: "right",
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11,
  },
  reviewList: {
    marginTop: 6,
  },
  reviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 16,
  },
  reviewItemDivided: {
    borderTopWidth: 1,
    borderTopColor: DefaultTheme.colors.line,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DefaultTheme.colors.primary,
  },
  reviewItemBody: {
    flex: 1,
    minWidth: 0,
  },
  reviewItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewAuthor: {
    flex: 1,
    minWidth: 0,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 13.5,
  },
  reviewDate: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  reviewItemStars: {
    marginTop: 3,
    color: "#C98A1E",
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12.5,
  },
  reviewComment: {
    marginTop: 7,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 12.5,
    lineHeight: 19,
  },
  sectionTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  sectionCaption: {
    marginTop: 16,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  addReviewButton: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  composer: {
    marginTop: 14,
  },
  composerSuccess: {
    minHeight: 244,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  composerSuccessTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
  },
  composerSuccessAction: {
    minHeight: 44,
    paddingHorizontal: 30,
  },
  composerSuccessText: {
    marginBottom: 6,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
  },
  composerLabel: {
    marginBottom: 6,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  starRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 14,
  },
  starButton: {
    paddingHorizontal: 2,
  },
  star: {
    color: "#C3C4BE",
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 27,
    lineHeight: 32,
  },
  starActive: {
    color: "#C98A1E",
  },
  commentInput: {
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: "top",
  },
  commentInputFocused: {
    borderColor: DefaultTheme.colors.primary,
  },
  counter: {
    marginTop: 5,
    textAlign: "right",
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
  },
  reviewError: {
    marginTop: 8,
    color: "#D64545",
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
  },
  composerActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  composerAction: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  actions: {
    marginTop: 24,
    flexDirection: "row",
    gap: 10,
  },
  action: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
});
