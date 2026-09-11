import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { FilterSheet } from '@/components/FilterSheet';
import { SaunaCard } from '@/components/SaunaCard';
import { SaunaMap } from '@/components/SaunaMap';
import { SearchHeader, type ViewMode } from '@/components/SearchHeader';
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
import { colors, spacing } from '@/theme';

export default function SearchScreen() {
  const { center, isPrecise, status, request } = useCurrentLocation();
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<SaunaFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { results, fetched, loading, error, usingSampleData, refresh } = useSaunaSearch(
    keyword,
    center,
    filters,
  );

  // 詳細画面が再取得せずに済むよう、一覧に出たぶんはキャッシュしておく。
  useEffect(() => {
    rememberSaunas(fetched);
  }, [fetched]);

  // 絞り込みで消えたピンが選択されたままにならないようにする。
  useEffect(() => {
    if (selectedId && !results.some((s) => s.id === selectedId)) {
      setSelectedId(null);
    }
  }, [results, selectedId]);

  const selected = useMemo(
    () => (selectedId ? results.find((s) => s.id === selectedId) : undefined),
    [results, selectedId],
  );

  const previewCount = useCallback(
    (draft: SaunaFilters) => applyFilters(fetched, draft).length,
    [fetched],
  );

  const header = (
    <SearchHeader
      input={input}
      onInputChange={setInput}
      onSubmit={() => setKeyword(input.trim())}
      onClear={() => {
        setInput('');
        setKeyword('');
      }}
      mode={mode}
      onModeChange={setMode}
      activeFilterCount={countActiveFilters(filters)}
      sortLabel={SORT_LABELS[filters.sort]}
      onOpenFilters={() => setSheetOpen(true)}
      resultCount={results.length}
      fetchedCount={fetched.length}
      loading={loading}
      isPrecise={isPrecise}
      locationStatus={status}
      onRequestLocation={() => void request()}
      usingSampleData={usingSampleData}
      error={error}
      onRetry={refresh}
    />
  );

  return (
    <View style={styles.screen}>
      {header}

      {mode === 'map' ? (
        <View style={styles.mapWrap}>
          <SaunaMap
            saunas={results}
            center={center}
            radiusMeters={filters.radiusMeters}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {selected ? (
            <View style={styles.selectedCard}>
              <SaunaCard sauna={selected} />
            </View>
          ) : results.length > 0 ? (
            <View style={styles.mapHint}>
              <Text style={styles.mapHintText}>ピンをタップすると施設が表示されます</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SaunaCard sauna={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
      )}

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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  separator: { height: spacing.md },
  mapWrap: { flex: 1 },
  selectedCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
  },
  mapHint: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapHintText: { fontSize: 12, color: colors.textMuted },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 13, color: colors.textMuted },
});
