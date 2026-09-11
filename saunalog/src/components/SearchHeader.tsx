import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LocationStatus } from '@/hooks/useCurrentLocation';
import { colors, radius, spacing } from '@/theme';

export type ViewMode = 'list' | 'map';

interface SearchHeaderProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  activeFilterCount: number;
  sortLabel: string;
  onOpenFilters: () => void;
  resultCount: number;
  fetchedCount: number;
  loading: boolean;
  isPrecise: boolean;
  locationStatus: LocationStatus;
  onRequestLocation: () => void;
  usingSampleData: boolean;
  error: string | null;
  onRetry: () => void;
}

export function SearchHeader({
  input,
  onInputChange,
  onSubmit,
  onClear,
  mode,
  onModeChange,
  activeFilterCount,
  sortLabel,
  onOpenFilters,
  resultCount,
  fetchedCount,
  loading,
  isPrecise,
  locationStatus,
  onRequestLocation,
  usingSampleData,
  error,
  onRetry,
}: SearchHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={onInputChange}
          onSubmitEditing={onSubmit}
          placeholder="エリア・施設名で検索（例: 錦糸町）"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
        />
        {input.length > 0 ? (
          <Pressable hitSlop={8} onPress={onClear} accessibilityLabel="検索語を消す">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
          onPress={onOpenFilters}>
          <Ionicons name="options-outline" size={16} color={colors.primary} />
          <Text style={styles.filterLabel}>絞り込み</Text>
          {activeFilterCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.segmented}>
          <ModeButton
            icon="list-outline"
            label="一覧"
            active={mode === 'list'}
            onPress={() => onModeChange('list')}
          />
          <ModeButton
            icon="map-outline"
            label="地図"
            active={mode === 'map'}
            onPress={() => onModeChange('map')}
          />
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.resultCount}>
          {loading ? '検索中…' : `${resultCount}件（取得 ${fetchedCount}件）・${sortLabel}`}
        </Text>
        {!isPrecise ? (
          <Pressable onPress={onRequestLocation} hitSlop={8}>
            <Text style={styles.link}>
              {locationStatus === 'denied' ? '位置情報が未許可（東京駅が基準）' : '現在地を使う'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {usingSampleData ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.noticeText}>
            APIキー未設定のためサンプルデータを表示しています（README を参照）
          </Text>
        </View>
      ) : null}

      {error ? (
        <Pressable style={[styles.notice, styles.noticeError]} onPress={onRetry}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[styles.noticeText, styles.noticeErrorText]}>{error}（タップで再試行）</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ModeButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}>
      <Ionicons name={icon} size={15} color={active ? colors.surface : colors.textMuted} />
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.8 },
  filterLabel: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { color: colors.surface, fontSize: 11, fontWeight: '700' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  modeButtonActive: { backgroundColor: colors.primary },
  modeLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  modeLabelActive: { color: colors.surface },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCount: { flex: 1, fontSize: 13, color: colors.textMuted },
  link: { fontSize: 13, color: colors.primary },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  noticeText: { flex: 1, fontSize: 12, color: colors.primary },
  noticeError: { backgroundColor: '#F6E5E1' },
  noticeErrorText: { color: colors.danger },
});
