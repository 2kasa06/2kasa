import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

interface RatingStarsProps {
  rating: number | null;
  reviewCount: number;
  size?: number;
}

/** 食べログの点数表示にならって、数値・星・件数を横一列で出す。 */
export function RatingStars({ rating, reviewCount, size = 14 }: RatingStarsProps) {
  if (rating == null) {
    return <Text style={styles.unrated}>評価なし</Text>;
  }

  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  return (
    <View style={styles.row}>
      <Text style={[styles.score, { fontSize: size + 3 }]}>{rating.toFixed(1)}</Text>
      <View style={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => {
          const name = i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline';
          return <Ionicons key={i} name={name} size={size} color={colors.accent} />;
        })}
      </View>
      <Text style={styles.count}>({reviewCount.toLocaleString('ja-JP')})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { flexDirection: 'row' },
  score: { fontWeight: '700', color: colors.accent },
  count: { fontSize: 12, color: colors.textMuted },
  unrated: { fontSize: 12, color: colors.textMuted },
});
