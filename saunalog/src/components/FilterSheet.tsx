import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import {
  DEFAULT_FILTERS,
  RADIUS_OPTIONS,
  RATING_OPTIONS,
  SORT_LABELS,
  type SaunaFilters,
  type SortKey,
} from '@/lib/filters';
import { CATEGORY_LABELS, PRICE_LABELS, type PriceLevel, type SaunaCategory } from '@/types';
import { colors, radius, spacing } from '@/theme';

import { Chip } from './Chip';

interface FilterSheetProps {
  visible: boolean;
  value: SaunaFilters;
  /** 適用後の件数をボタンに出すため、下書き条件での件数を親から受け取る。 */
  previewCount: (draft: SaunaFilters) => number;
  onApply: (next: SaunaFilters) => void;
  onClose: () => void;
}

const CATEGORY_ORDER: SaunaCategory[] = ['sauna', 'super_sento', 'sento', 'hotel', 'spa', 'other'];
const PRICE_ORDER: PriceLevel[] = [
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];
const SORT_ORDER: SortKey[] = ['recommended', 'rating', 'distance', 'reviews'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

function radiusLabel(meters: number): string {
  return meters >= 1000 ? `${meters / 1000}km以内` : `${meters}m以内`;
}

export function FilterSheet({ visible, value, previewCount, onApply, onClose }: FilterSheetProps) {
  const [draft, setDraft] = useState<SaunaFilters>(value);

  // 開くたびに現在の条件から編集を始める。閉じて破棄した編集は持ち越さない。
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const count = previewCount(draft);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.headerAction}>閉じる</Text>
          </Pressable>
          <Text style={styles.headerTitle}>絞り込み</Text>
          <Pressable onPress={() => setDraft(DEFAULT_FILTERS)} hitSlop={12}>
            <Text style={styles.headerAction}>リセット</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Section title="並び替え">
            {SORT_ORDER.map((key) => (
              <Chip
                key={key}
                label={SORT_LABELS[key]}
                selected={draft.sort === key}
                onPress={() => setDraft({ ...draft, sort: key })}
              />
            ))}
          </Section>

          <Section title="現在地からの距離">
            {RADIUS_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={radiusLabel(m)}
                selected={draft.radiusMeters === m}
                onPress={() => setDraft({ ...draft, radiusMeters: m })}
              />
            ))}
          </Section>

          <Section title="評価">
            {RATING_OPTIONS.map((r) => (
              <Chip
                key={r}
                label={r === 0 ? '指定なし' : `★${r.toFixed(1)}以上`}
                selected={draft.minRating === r}
                onPress={() => setDraft({ ...draft, minRating: r })}
              />
            ))}
          </Section>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.sectionTitle}>いま営業中のみ</Text>
              <Text style={styles.hint}>営業時間が未掲載の施設は除外されます</Text>
            </View>
            <Switch
              value={draft.openNowOnly}
              onValueChange={(v) => setDraft({ ...draft, openNowOnly: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <Section title="施設タイプ">
            {CATEGORY_ORDER.map((c) => (
              <Chip
                key={c}
                label={CATEGORY_LABELS[c]}
                selected={draft.categories.includes(c)}
                onPress={() => setDraft({ ...draft, categories: toggle(draft.categories, c) })}
              />
            ))}
          </Section>

          <Section title="価格帯">
            {PRICE_ORDER.map((p) => (
              <Chip
                key={p}
                label={PRICE_LABELS[p]}
                selected={draft.priceLevels.includes(p)}
                onPress={() => setDraft({ ...draft, priceLevels: toggle(draft.priceLevels, p) })}
              />
            ))}
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.applyButton, pressed && styles.applyPressed]}
            onPress={() => onApply(draft)}>
            <Text style={styles.applyLabel}>{count}件を表示</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerAction: { fontSize: 15, color: colors.primary },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl * 2 },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg - 2,
    alignItems: 'center',
  },
  applyPressed: { opacity: 0.85 },
  applyLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
