import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { buildPhotoUrl } from '@/api/places';
import { RatingStars } from '@/components/RatingStars';
import { formatDistance } from '@/lib/geo';
import { getCachedSauna } from '@/lib/store';
import { CATEGORY_LABELS, PRICE_LABELS } from '@/types';
import { colors, radius, spacing } from '@/theme';

export default function SaunaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sauna = id ? getCachedSauna(id) : undefined;

  if (!sauna) {
    return (
      <View style={styles.missing}>
        <Ionicons name="help-circle-outline" size={32} color={colors.textMuted} />
        <Text style={styles.missingText}>施設の情報が見つかりませんでした。一覧からやり直してください。</Text>
      </View>
    );
  }

  const photoUrl = sauna.photoName ? buildPhotoUrl(sauna.photoName, 900) : null;
  const distance = formatDistance(sauna.distanceMeters);

  const openMap = () => {
    const { latitude, longitude } = sauna.location;
    const label = encodeURIComponent(sauna.name);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${label}&ll=${latitude},${longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    void Linking.openURL(url);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: sauna.name }} />

      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.hero} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Ionicons name="water-outline" size={40} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.block}>
        <Text style={styles.name}>{sauna.name}</Text>
        <RatingStars rating={sauna.rating} reviewCount={sauna.reviewCount} size={16} />
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{CATEGORY_LABELS[sauna.category]}</Text>
          {sauna.priceLevel ? <Text style={styles.badge}>{PRICE_LABELS[sauna.priceLevel]}</Text> : null}
          {sauna.openNow === true ? <Text style={[styles.badge, styles.badgeOpen]}>営業中</Text> : null}
        </View>
      </View>

      <View style={styles.block}>
        <Row icon="location-outline" text={sauna.address} onPress={openMap} />
        {distance ? <Row icon="navigate-outline" text={`現在地から約${distance}`} /> : null}
        {sauna.phone ? (
          <Row
            icon="call-outline"
            text={sauna.phone}
            onPress={() => void Linking.openURL(`tel:${sauna.phone}`)}
          />
        ) : null}
        {sauna.website ? (
          <Row
            icon="globe-outline"
            text={sauna.website}
            onPress={() => void Linking.openURL(sauna.website as string)}
          />
        ) : null}
      </View>

      {sauna.weekdayHours.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>営業時間</Text>
          {sauna.weekdayHours.map((line) => (
            <Text key={line} style={styles.hours}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.attribution}>施設情報の提供: Google</Text>
    </ScrollView>
  );
}

function Row({
  icon,
  text,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.rowText, onPress && styles.rowLink]}>{text}</Text>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="link" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  hero: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  block: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  badge: {
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeOpen: { color: colors.success, backgroundColor: '#E4F1EA' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  rowText: { flex: 1, fontSize: 14, color: colors.text },
  rowLink: { color: colors.primary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  hours: { fontSize: 13, color: colors.textMuted },
  attribution: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  missingText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
