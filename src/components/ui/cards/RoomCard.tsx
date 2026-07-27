import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { DefaultTheme } from '@/constants/defaultTheme';
import type { PublicRoomModel } from '@/models/contentModel';

import { InteractiveCard } from './InteractiveCard';

export function RoomCard({
  room,
  onPressDetails,
}: {
  room: PublicRoomModel;
  onPressDetails?: (room: PublicRoomModel) => void;
}) {
  return (
    <InteractiveCard
      borderEffect="race"
      hoverBorderColor={DefaultTheme.colors.primary}
      liftDistance={10}
      accessibilityLabel={`View details for ${room.label}`}
      onPress={() => onPressDetails?.(room)}
      style={styles.card}>
      <View style={styles.imageWrap}>
        {room.coverPhoto ? (
          <Image source={{ uri: room.coverPhoto.uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <AppIcon name="rooms" size={26} tintColor={DefaultTheme.colors.muted} />
            <Text style={styles.imageFallbackText}>No photo uploaded yet</Text>
          </View>
        )}
        <View style={[styles.status, room.available ? styles.available : styles.occupied]}>
          <Text
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.1}
            numberOfLines={1}
            style={[styles.statusText, !room.available && styles.occupiedText]}>
            {room.status}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={styles.name}>
            {room.headline}
          </Text>
          <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={styles.rating}>
            ☆ {room.ratingLabel}
          </Text>
        </View>
        <View style={styles.tags}>
          <Tag label={room.capacityLabel} />
          {room.amenities.slice(0, 1).map((amenity) => (
            <Tag key={amenity} label={amenity} />
          ))}
        </View>
        <View style={styles.rateRow}>
          <View>
            <Text style={styles.rateLabel}>MONTHLY RATE</Text>
            <Text style={styles.rate}>{room.rateLabel}</Text>
          </View>
          <ViewDetailsButton room={room} onPress={onPressDetails} />
        </View>
      </View>
    </InteractiveCard>
  );
}

function ViewDetailsButton({
  room,
  onPress,
}: {
  room: PublicRoomModel;
  onPress?: (room: PublicRoomModel) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View details for ${room.label}`}
      style={[styles.details, hovered && styles.detailsHovered]}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => onPress?.(room)}>
      <Text style={[styles.detailsText, hovered && styles.detailsTextHovered]}>View Details</Text>
    </Pressable>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.1} numberOfLines={1} style={styles.tagText}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: DefaultTheme.radius.md,
  },
  imageWrap: {
    height: 238,
    overflow: 'hidden',
    backgroundColor: '#E5E4DB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageFallbackText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
  },
  status: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 72,
    maxWidth: '72%',
    paddingHorizontal: 11,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DefaultTheme.radius.pill,
  },
  available: {
    backgroundColor: DefaultTheme.colors.primary,
  },
  occupied: {
    backgroundColor: '#EFF0ED',
  },
  statusText: {
    flexShrink: 1,
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  occupiedText: {
    color: '#7D7E78',
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 18,
  },
  rating: {
    flexShrink: 0,
    color: '#6B7200',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 7,
  },
  tag: {
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: '#FBFCEC',
    borderWidth: 1,
    borderColor: '#E6EABD',
  },
  tagText: {
    color: '#758000',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 8,
  },
  rateRow: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  rateLabel: {
    color: '#777874',
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  rate: {
    marginTop: 2,
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 17,
  },
  details: {
    borderWidth: 1,
    borderColor: '#D8DAD7',
    borderRadius: DefaultTheme.radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  detailsHovered: {
    borderColor: DefaultTheme.colors.primary,
    backgroundColor: DefaultTheme.colors.softOlive,
  },
  detailsText: {
    color: '#575854',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
  },
  detailsTextHovered: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodyBold,
  },
});
