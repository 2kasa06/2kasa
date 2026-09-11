import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildPhotoUrl } from '@/api/places';
import { formatDistance } from '@/lib/geo';
import { CATEGORY_LABELS, PRICE_LABELS, type Sauna } from '@/types';
import { colors, radius, spacing } from '@/theme';

import { RatingStars } from './RatingStars';

interface SaunaCardProps {
  sauna: Sauna;
}

export function SaunaCard({ sauna }: SaunaCardProps) {
  const photoUrl = sauna.photoName ? buildPhotoUrl(sauna.photoName, 320) : null;
  const distance = formatDistance(sauna.distanceMeters);

  return (
    <Link href={{ pathname: '/sauna/[id]', params: { id: sauna.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.thumbWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.thumb} contentFit="cover" transition={150} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="water-outline" size={26} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {sauna.name}
          </Text>

          <RatingStars rating={sauna.rating} reviewCount={sauna.reviewCount} />

          <View style={styles.metaRow}>
            <Text style={styles.badge}>{CATEGORY_LABELS[sauna.category]}</Text>
            {sauna.priceLevel ? <Text style={styles.badge}>{PRICE_LABELS[sauna.priceLevel]}</Text> : null}
            {sauna.openNow === true ? (
              <Text style={[styles.badge, styles.badgeOpen]}>営業中</Text>
            ) : sauna.openNow === false ? (
              <Text style={[styles.badge, styles.badgeClosed]}>営業時間外</Text>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            {distance ? (
              <View style={styles.inlineRow}>
                <Ionicons name="navigate-outline" size={13} color={colors.textMuted} />
                <Text style={styles.muted}>{distance}</Text>
              </View>
            ) : null}
            <Text style={[styles.muted, styles.address]} numberOfLines={1}>
              {sauna.address}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  thumbWrap: { width: 92 },
  thumb: { width: 92, height: 92, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 6 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeOpen: { color: colors.success, backgroundColor: '#E4F1EA' },
  badgeClosed: { color: colors.danger, backgroundColor: '#F6E5E1' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  muted: { fontSize: 12, color: colors.textMuted },
  address: { flex: 1 },
});
