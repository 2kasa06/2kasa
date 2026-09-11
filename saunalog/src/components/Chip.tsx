import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** 絞り込みの選択肢で使うトグル。選択中は水風呂ブルーで塗る。 */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
