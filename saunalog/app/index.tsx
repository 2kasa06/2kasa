import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FilterSheet } from '@/components/FilterSheet';
import { SaunaCard } from '@/components/SaunaCard';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useSaunaSearch } from '@/hooks/useSaunaSearch';
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  SORT_LABELS,
  type SaunaFilters,
} from '@/lib/filters';
import { rememberSaunas } from '@/lib/store';
import { colors, radius, spacing } from '@/theme';

export default function SearchScreen() {
  const { center, isPrecise, status, request } = useCurrentLocation();
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<SaunaFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { results, fetched, loading, error, usingSampleData, refresh } = useSaunaSearch(
    keyword,
    center,
    filters,
  );

  // 詳細画面が再取得せずに済むよう、一覧に出たぶんはキャッシュしておく。
  useEffect(() => {
    rememberSaunas(fetched);
  }, [fetched]);

  const activeCount = countActiveFilters(filters);
  const previewCount = useCallback(
    (draft: SaunaFilters) => applyFilters(fetched, draft).length,
    [fetched],
  );

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => setKeyword(input.trim())}
            placeholder="エリア・施設名で検索（例: 錦糸町）"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {input.length > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                setInput('');
                setKeyword('');
              }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
            onPress={() => setSheetOpen(true)}>
            <Ionicons name="options-outline" size={16} color={colors.primary} />
            <Text style={styles.filterLabel}>絞り込み</Text>
            {activeCount > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Text style={styles.sortLabel}>{SORT_LABELS[filters.sort]}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.resultCount}>
            {loading ? '検索中…' : `${results.length}件（取得 ${fetched.length}件）`}
          </Text>
          {!isPrecise ? (
            <Pressable onPress={() => void request()} hitSlop={8}>
              <Text style={styles.link}>
                {status === 'denied' ? '位置情報が未許可（東京駅を基準に表示）' : '現在地を使う'}
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
          <Pressable style={[styles.notice, styles.noticeError]} onPress={refresh}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={[styles.noticeText, styles.noticeErrorText]}>
              {error}（タップで再試行）
            </Text>
          </Pressable>
        ) : null}
      </View>
    ),
    [
      input,
      activeCount,
      filters.sort,
      loading,
      results.length,
      fetched.length,
      isPrecise,
      status,
      request,
      usingSampleData,
      error,
      refresh,
    ],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SaunaCard sauna={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.empty} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="thermometer-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>条件に合うサウナが見つかりません</Text>
              <Text style={styles.emptyBody}>距離を広げるか、絞り込みを外してみてください。</Text>
            </View>
          )
        }
      />

      <FilterSheet
        visible={sheetOpen}
        value={filters}
        previewCount={previewCount}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { gap: spacing.md, marginBottom: spacing.lg },
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
  countBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sortLabel: { fontSize: 13, color: colors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCount: { fontSize: 13, color: colors.textMuted },
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
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 13, color: colors.textMuted },
});
