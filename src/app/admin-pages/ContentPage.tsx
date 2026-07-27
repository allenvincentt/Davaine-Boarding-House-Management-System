import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { MainContentArea } from '@/components/layout/MainContentArea';
import { AppIcon } from '@/components/ui/AppIcon';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { PageFabStack, usePageScrollNavigator } from '@/components/ui/buttons/PageFabStack';
import { Card } from '@/components/ui/cards/Card';
import { KPICard, KPICardsRow } from '@/components/ui/cards/KPICards';
import { ConfirmDialog } from '@/components/ui/modals/ConfirmDialog';
import { SearchField } from '@/components/ui/SearchField';
import { DefaultTheme } from '@/constants/defaultTheme';
import { buildingToneOf } from '@/constants/roomTheme';
import {
  MAX_CAROUSEL_SLIDES,
  MAX_ROOM_CAPACITY,
  MAX_ROOM_PHOTOS,
  coverPhotoOf,
  type CarouselSlideModel,
  type RoomContentModel,
} from '@/models/contentModel';
import {
  buildingLabel,
  roomLabel,
  roomShortLabel,
  sortRooms,
  type RoomModel,
} from '@/models/roomModel';
import { useAuth } from '@/providers/AuthProvider';
import { can } from '@/services/accessControl';
import {
  addCarouselSlide,
  addRoomPhoto,
  listCarouselSlides,
  listRoomContent,
  moveCarouselSlide,
  removeCarouselSlide,
  removeRoomPhoto,
  setRoomCoverPhoto,
  updateRoomDetails,
} from '@/services/contentService';
import { pickPhotoFromLibrary } from '@/services/photoPickerService';
import { listRooms } from '@/services/roomManagementService';

type PendingRemoval =
  | { kind: 'slide'; id: string }
  | { kind: 'photo'; roomId: string; id: string };

export default function ContentPage() {
  const { width } = useWindowDimensions();
  const compact = width < DefaultTheme.layout.compactNavigation;
  const { profile } = useAuth();
  const scrollNavigator = usePageScrollNavigator();

  const role = profile?.userRole ?? null;
  const canEdit = can(role, 'update', 'content') || can(role, 'create', 'content');

  const [rooms, setRooms] = useState<RoomModel[]>([]);
  const [slides, setSlides] = useState<CarouselSlideModel[]>([]);
  const [content, setContent] = useState<Record<string, RoomContentModel>>({});
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState('');
  const [detailsDirty, setDetailsDirty] = useState(false);

  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [roomRows, slideRows, contentRows] = await Promise.all([
        listRooms(),
        listCarouselSlides(),
        listRoomContent(),
      ]);

      if (!activeRef.current) {
        return;
      }

      const sorted = sortRooms(roomRows);
      setRooms(sorted);
      setSlides(slideRows);
      setContent(Object.fromEntries(contentRows.map((row) => [row.roomId, row])));
      setSelectedRoomId((current) => current ?? sorted[0]?.id ?? null);
    } catch (error) {
      if (activeRef.current) {
        setActionError(error instanceof Error ? error.message : 'Unable to load website content.');
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

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const selectedContent = selectedRoomId ? (content[selectedRoomId] ?? null) : null;

  useEffect(() => {
    if (!selectedContent) {
      return;
    }
    setCapacity(String(selectedContent.capacity));
    setDescription(selectedContent.description);
    setAmenities(selectedContent.amenities.join(', '));
    setDetailsDirty(false);
  }, [selectedContent]);

  const filteredRooms = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return rooms;
    }
    return rooms.filter(
      (room) =>
        roomLabel(room).toLowerCase().includes(term) ||
        roomShortLabel(room).toLowerCase().includes(term),
    );
  }, [rooms, query]);

  const totalRoomPhotos = Object.values(content).reduce(
    (sum, item) => sum + item.photos.length,
    0,
  );
  const roomsWithPhotos = Object.values(content).filter((item) => item.photos.length > 0).length;

  const run = useCallback(async (action: () => Promise<string>) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const message = await action();
      if (activeRef.current) {
        setNotice(message);
      }
    } catch (error) {
      if (activeRef.current) {
        setActionError(error instanceof Error ? error.message : 'That change could not be saved.');
      }
    } finally {
      if (activeRef.current) {
        setBusy(false);
      }
    }
  }, []);

  const handleAddSlide = useCallback(() => {
    run(async () => {
      const uri = await pickPhotoFromLibrary();
      if (!uri) {
        return 'No photo was selected.';
      }
      const rows = await addCarouselSlide(uri);
      setSlides(rows);
      return 'The photo was added to the landing carousel.';
    });
  }, [run]);

  const handleMoveSlide = useCallback(
    (slideId: string, direction: -1 | 1) => {
      run(async () => {
        const rows = await moveCarouselSlide(slideId, direction);
        setSlides(rows);
        return 'The carousel order was updated.';
      });
    },
    [run],
  );

  const handleRemoveSlide = useCallback(
    (slideId: string) => {
      run(async () => {
        const rows = await removeCarouselSlide(slideId);
        setSlides(rows);
        return 'The photo was removed from the carousel.';
      });
    },
    [run],
  );

  const applyContent = useCallback((next: RoomContentModel) => {
    setContent((current) => ({ ...current, [next.roomId]: next }));
  }, []);

  const handleAddRoomPhoto = useCallback(() => {
    if (!selectedRoom) {
      return;
    }
    run(async () => {
      const uri = await pickPhotoFromLibrary();
      if (!uri) {
        return 'No photo was selected.';
      }
      const next = await addRoomPhoto(selectedRoom.id, uri);
      applyContent(next);
      return `The photo was added to ${roomLabel(selectedRoom)}.`;
    });
  }, [run, selectedRoom, applyContent]);

  const handleSetCover = useCallback(
    (roomId: string, photoId: string) => {
      run(async () => {
        const next = await setRoomCoverPhoto(roomId, photoId);
        applyContent(next);
        return 'The room card photo was updated.';
      });
    },
    [run, applyContent],
  );

  const handleRemovePhoto = useCallback(
    (roomId: string, photoId: string) => {
      run(async () => {
        const next = await removeRoomPhoto(roomId, photoId);
        applyContent(next);
        return 'The photo was removed from the room slider.';
      });
    },
    [run, applyContent],
  );

  const handleSaveDetails = useCallback(() => {
    if (!selectedRoom) {
      return;
    }
    run(async () => {
      const next = await updateRoomDetails(selectedRoom.id, {
        description,
        capacity: Number(capacity.replace(/[^\d]/g, '')),
        amenities: amenities.split(',').map((item) => item.trim()),
      });
      applyContent(next);
      setDetailsDirty(false);
      return `${roomLabel(selectedRoom)} details were saved.`;
    });
  }, [run, selectedRoom, description, capacity, amenities, applyContent]);

  const confirmRemoval = useCallback(() => {
    if (!pendingRemoval) {
      return;
    }
    if (pendingRemoval.kind === 'slide') {
      handleRemoveSlide(pendingRemoval.id);
      return;
    }
    handleRemovePhoto(pendingRemoval.roomId, pendingRemoval.id);
  }, [pendingRemoval, handleRemoveSlide, handleRemovePhoto]);

  const cover = selectedContent ? coverPhotoOf(selectedContent) : null;

  return (
    <View style={styles.page}>
      <MainContentArea {...scrollNavigator.scrollProps}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Content</Text>
            <Text style={styles.subtitle}>
              {canEdit
                ? 'Upload the photos and copy shown on the public landing page.'
                : 'Viewing the website photos and copy (read-only).'}
            </Text>
          </View>
          {!compact && canEdit && (
            <GradientButton
              accessibilityLabel="Add carousel photo"
              style={styles.addButton}
              onPress={handleAddSlide}>
              <AppIcon name="plus" size={15} tintColor={DefaultTheme.colors.white} />
              <Text style={styles.addButtonLabel}>Add Carousel Photo</Text>
            </GradientButton>
          )}
        </View>

        <KPICardsRow>
          <KPICard
            label="Carousel Photos"
            value={slides.length}
            icon="document"
            iconColor={DefaultTheme.colors.primary}
            iconBackground={DefaultTheme.colors.softOlive}
            accentColor={DefaultTheme.colors.primary}
            caption={`of ${MAX_CAROUSEL_SLIDES} slots used`}
            progress={slides.length / MAX_CAROUSEL_SLIDES}
          />
          <KPICard
            label="Room Photos"
            value={totalRoomPhotos}
            icon="rooms"
            iconColor="#4EA4E5"
            iconBackground={DefaultTheme.colors.softBlue}
            accentColor="#4EA4E5"
            caption={`Across ${rooms.length} room(s)`}
            progress={1}
          />
          <KPICard
            label="Rooms With Photos"
            value={roomsWithPhotos}
            icon="eye"
            iconColor="#2E8A57"
            iconBackground="#E4F5EA"
            accentColor="#2E8A57"
            caption={`of ${rooms.length} room(s) published`}
            progress={rooms.length === 0 ? 0 : roomsWithPhotos / rooms.length}
          />
          <KPICard
            label="Photos Per Room"
            value={MAX_ROOM_PHOTOS}
            icon="chart"
            iconColor="#7C5CD6"
            iconBackground="#EDE7F6"
            accentColor="#7C5CD6"
            caption="Maximum slider photos"
            progress={1}
          />
        </KPICardsRow>

        {(notice || actionError) && (
          <Banner
            tone={actionError ? 'error' : 'success'}
            message={actionError ?? notice ?? ''}
            onDismiss={() => {
              setNotice(null);
              setActionError(null);
            }}
          />
        )}

        <Card
          title="Landing Carousel"
          subtitle="Photos shown in the curved carousel on the home section"
          style={styles.card}
          revealDelay={280}
          action={
            canEdit ? (
              <MatchaButton
                label="Add Photo"
                icon="plus"
                variant="outline"
                disabled={busy || slides.length >= MAX_CAROUSEL_SLIDES}
                onPress={handleAddSlide}
              />
            ) : undefined
          }>
          {loading && slides.length === 0 ? (
            <LoadingBlock label="Loading carousel photos…" />
          ) : slides.length === 0 ? (
            <EmptyBlock text="No carousel photos yet. Upload one to fill the home section." />
          ) : (
            <View style={styles.slideGrid}>
              {slides.map((slide, index) => (
                <View key={slide.id} style={styles.slideTile}>
                  <Image source={{ uri: slide.uri }} style={styles.slideImage} resizeMode="cover" />
                  <View style={styles.slideOrder}>
                    <Text style={styles.slideOrderText}>{index + 1}</Text>
                  </View>
                  {canEdit && (
                    <View style={styles.slideActions}>
                      <TileButton
                        icon="chevronLeft"
                        label="Move earlier"
                        disabled={busy || index === 0}
                        onPress={() => handleMoveSlide(slide.id, -1)}
                      />
                      <TileButton
                        icon="chevronRight"
                        label="Move later"
                        disabled={busy || index === slides.length - 1}
                        onPress={() => handleMoveSlide(slide.id, 1)}
                      />
                      <TileButton
                        icon="trash"
                        label="Remove photo"
                        destructive
                        disabled={busy}
                        onPress={() => setPendingRemoval({ kind: 'slide', id: slide.id })}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card
          title="Room Photos"
          subtitle="The card photo and the details slider for every room"
          style={styles.card}
          revealDelay={340}
          {...scrollNavigator.targetProps}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search a room…"
            style={styles.search}
          />

          <View style={styles.roomChips}>
            {filteredRooms.length === 0 ? (
              <Text style={styles.emptyText}>No rooms match your search.</Text>
            ) : (
              filteredRooms.map((room) => {
                const tone = buildingToneOf(room.building);
                const active = room.id === selectedRoomId;
                const photoCount = content[room.id]?.photos.length ?? 0;

                return (
                  <Pressable
                    key={room.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Edit photos for ${roomLabel(room)}`}
                    style={[
                      styles.roomChip,
                      { borderColor: tone.border },
                      active && styles.roomChipActive,
                    ]}
                    onPress={() => setSelectedRoomId(room.id)}>
                    <View style={[styles.roomChipBadge, { backgroundColor: tone.background }]}>
                      <Text style={[styles.roomChipBadgeText, { color: tone.color }]}>
                        {roomShortLabel(room)}
                      </Text>
                    </View>
                    <View style={styles.roomChipText}>
                      <Text
                        style={[styles.roomChipLabel, active && styles.roomChipLabelActive]}
                        numberOfLines={1}>
                        {roomLabel(room)}
                      </Text>
                      <Text style={styles.roomChipCaption} numberOfLines={1}>
                        {photoCount} photo{photoCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {loading && !selectedContent ? (
            <LoadingBlock label="Loading room photos…" />
          ) : !selectedRoom || !selectedContent ? (
            <EmptyBlock text="Pick a room to manage its photos." />
          ) : (
            <View style={styles.roomEditor}>
              <View style={styles.coverRow}>
                <View style={styles.coverPreview}>
                  {cover ? (
                    <Image source={{ uri: cover.uri }} style={styles.coverImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.coverEmpty}>
                      <AppIcon name="rooms" size={22} tintColor={DefaultTheme.colors.muted} />
                    </View>
                  )}
                  <View style={styles.coverTag}>
                    <Text style={styles.coverTagText}>ROOM CARD PHOTO</Text>
                  </View>
                </View>
                <View style={styles.coverCopy}>
                  <Text style={styles.editorTitle}>{roomLabel(selectedRoom)}</Text>
                  <Text style={styles.editorCaption}>
                    {buildingLabel(selectedRoom.building)} · The first photo is used on the landing
                    room card, and every photo appears in the details slider.
                  </Text>
                  {canEdit && (
                    <MatchaButton
                      label="Upload Photo"
                      icon="plus"
                      variant="outline"
                      disabled={busy || selectedContent.photos.length >= MAX_ROOM_PHOTOS}
                      style={styles.uploadButton}
                      onPress={handleAddRoomPhoto}
                    />
                  )}
                </View>
              </View>

              {selectedContent.photos.length === 0 ? (
                <EmptyBlock text="This room has no photos yet. Upload one so it can appear on the website." />
              ) : (
                <View style={styles.photoGrid}>
                  {selectedContent.photos.map((photo) => {
                    const isCover = cover?.id === photo.id;

                    return (
                      <View
                        key={photo.id}
                        style={[styles.photoTile, isCover && styles.photoTileCover]}>
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                        {isCover && (
                          <View style={styles.coverBadge}>
                            <AppIcon name="check" size={10} tintColor={DefaultTheme.colors.white} />
                            <Text style={styles.coverBadgeText}>Cover</Text>
                          </View>
                        )}
                        {canEdit && (
                          <View style={styles.slideActions}>
                            <TileButton
                              icon="eye"
                              label="Use as room card photo"
                              disabled={busy || isCover}
                              onPress={() => handleSetCover(selectedRoom.id, photo.id)}
                            />
                            <TileButton
                              icon="trash"
                              label="Remove photo"
                              destructive
                              disabled={busy}
                              onPress={() =>
                                setPendingRemoval({
                                  kind: 'photo',
                                  roomId: selectedRoom.id,
                                  id: photo.id,
                                })
                              }
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.detailFields}>
                <LabelledField
                  label={`Good for (max ${MAX_ROOM_CAPACITY} pax)`}
                  value={capacity}
                  editable={canEdit}
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setCapacity(value);
                    setDetailsDirty(true);
                  }}
                />
                <LabelledField
                  label="Amenities (comma separated)"
                  value={amenities}
                  editable={canEdit}
                  onChangeText={(value) => {
                    setAmenities(value);
                    setDetailsDirty(true);
                  }}
                />
                <LabelledField
                  label="Description"
                  value={description}
                  editable={canEdit}
                  multiline
                  onChangeText={(value) => {
                    setDescription(value);
                    setDetailsDirty(true);
                  }}
                />
                {canEdit && (
                  <MatchaButton
                    label={busy ? 'Saving…' : 'Save Room Details'}
                    icon="check"
                    disabled={busy || !detailsDirty}
                    style={styles.saveButton}
                    onPress={handleSaveDetails}
                  />
                )}
              </View>
            </View>
          )}
        </Card>
      </MainContentArea>

      {compact && (
        <PageFabStack
          navigator={scrollNavigator}
          primaryIcon={canEdit ? 'plus' : undefined}
          primaryLabel="Add carousel photo"
          onPrimaryPress={canEdit ? handleAddSlide : undefined}
          downLabel="To Room Photos"
        />
      )}

      <ConfirmDialog
        visible={pendingRemoval !== null}
        icon="trash"
        tone="destructive"
        title="Remove this photo?"
        message={
          pendingRemoval?.kind === 'slide'
            ? 'The photo will disappear from the landing carousel.'
            : 'The photo will disappear from the room card and the details slider.'
        }
        confirmLabel="Remove Photo"
        onConfirm={confirmRemoval}
        onClose={() => setPendingRemoval(null)}
      />
    </View>
  );
}

function LabelledField({
  label,
  value,
  onChangeText,
  editable,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  multiline?: boolean;
  keyboardType?: 'number-pad';
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        cursorColor={DefaultTheme.colors.primary}
        underlineColorAndroid="transparent"
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMultiline,
          focused && styles.fieldInputFocused,
          !editable && styles.fieldInputDisabled,
        ]}
      />
    </View>
  );
}

function TileButton({
  icon,
  label,
  onPress,
  disabled,
  destructive,
}: {
  icon: 'chevronLeft' | 'chevronRight' | 'trash' | 'eye';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={[styles.tileButton, disabled && styles.tileButtonDisabled]}
      onPress={onPress}>
      <AppIcon
        name={icon}
        size={13}
        tintColor={destructive ? '#C4453B' : DefaultTheme.colors.ink}
      />
    </Pressable>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator color={DefaultTheme.colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <View style={styles.emptyBlock}>
      <AppIcon name="inbox" size={20} tintColor={DefaultTheme.colors.muted} />
      <Text style={styles.emptyText}>{text}</Text>
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
  addButton: {
    minHeight: 44,
    paddingHorizontal: 22,
  },
  addButtonLabel: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
  },
  card: {
    width: '100%',
  },
  search: {
    marginBottom: 14,
  },
  slideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slideTile: {
    width: 148,
    height: 108,
    borderRadius: DefaultTheme.radius.sm,
    overflow: 'hidden',
    backgroundColor: '#E5E4DB',
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideOrder: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: 'rgba(32,32,31,0.72)',
  },
  slideOrderText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10,
    textAlign: 'center',
  },
  slideActions: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    gap: 6,
  },
  tileButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  tileButtonDisabled: {
    opacity: 0.4,
  },
  roomChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 168,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    backgroundColor: DefaultTheme.colors.white,
  },
  roomChipActive: {
    borderColor: DefaultTheme.colors.primary,
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  roomChipBadge: {
    width: 32,
    height: 32,
    borderRadius: DefaultTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomChipBadgeText: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 11.5,
  },
  roomChipText: {
    flex: 1,
    minWidth: 0,
  },
  roomChipLabel: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  roomChipLabelActive: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
  },
  roomChipCaption: {
    marginTop: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  roomEditor: {
    marginTop: 18,
    gap: 18,
  },
  coverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  coverPreview: {
    width: 196,
    height: 132,
    borderRadius: DefaultTheme.radius.md,
    overflow: 'hidden',
    backgroundColor: '#E5E4DB',
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverEmpty: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: 'rgba(32,32,31,0.72)',
  },
  coverTagText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 8.5,
    letterSpacing: 0.5,
  },
  coverCopy: {
    flex: 1,
    minWidth: 220,
  },
  editorTitle: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
  },
  editorCaption: {
    marginTop: 6,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  uploadButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoTile: {
    width: 132,
    height: 98,
    borderRadius: DefaultTheme.radius.sm,
    overflow: 'hidden',
    backgroundColor: '#E5E4DB',
    borderWidth: 2,
    borderColor: DefaultTheme.colors.line,
  },
  photoTileCover: {
    borderColor: DefaultTheme.colors.primary,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: DefaultTheme.colors.primary,
  },
  coverBadgeText: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 9,
  },
  detailFields: {
    gap: 14,
  },
  fieldLabel: {
    marginBottom: 6,
    marginLeft: 2,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: DefaultTheme.radius.sm,
    borderWidth: 1.5,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13.5,
  },
  fieldInputMultiline: {
    minHeight: 104,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  fieldInputFocused: {
    borderColor: DefaultTheme.colors.primary,
  },
  fieldInputDisabled: {
    backgroundColor: DefaultTheme.colors.cool,
    color: DefaultTheme.colors.muted,
  },
  saveButton: {
    alignSelf: 'flex-start',
  },
  loadingBlock: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 26,
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.line,
    backgroundColor: DefaultTheme.colors.white,
  },
  emptyText: {
    paddingHorizontal: 18,
    textAlign: 'center',
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
});
