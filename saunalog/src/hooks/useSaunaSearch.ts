import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { filterMockByKeyword, mockSaunas } from '@/api/mock';
import { getApiKey, searchSaunas } from '@/api/places';
import { applyFilters, type SaunaFilters } from '@/lib/filters';
import type { LatLng, Sauna } from '@/types';

export interface SaunaSearchState {
  /** 絞り込み・並び替え適用後の一覧。画面はこれを描画する。 */
  results: Sauna[];
  /** 絞り込み前の取得結果。件数表示と、絞り込みシートの件数プレビューに使う。 */
  fetched: Sauna[];
  loading: boolean;
  error: string | null;
  /** APIキーが無く、サンプルデータで動いている状態。 */
  usingSampleData: boolean;
  refresh: () => void;
}

/**
 * キーワードと現在地から施設を取得し、絞り込みを適用して返す。
 * 取得（ネットワーク）と絞り込み（ローカル）を分けてあるので、
 * 並び替えや評価の絞り込みを変えても再取得は起きない。
 */
export function useSaunaSearch(
  keyword: string,
  center: LatLng | null,
  filters: SaunaFilters,
): SaunaSearchState {
  const [fetched, setFetched] = useState<Sauna[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const usingSampleData = getApiKey() == null;
  const abortRef = useRef<AbortController | null>(null);

  // 取得に影響するのは検索キーワード・中心・半径だけ。他の条件はローカルで効かせる。
  const radius = filters.radiusMeters;
  const lat = center?.latitude ?? null;
  const lng = center?.longitude ?? null;

  useEffect(() => {
    let cancelled = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const centerForQuery: LatLng | null = lat != null && lng != null ? { latitude: lat, longitude: lng } : null;

    if (usingSampleData) {
      setLoading(false);
      setError(null);
      setFetched(filterMockByKeyword(mockSaunas(centerForQuery), keyword));
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    setLoading(true);
    setError(null);
    searchSaunas({ keyword, center: centerForQuery, radiusMeters: radius, signal: controller.signal })
      .then((items) => {
        if (cancelled) return;
        setFetched(items);
      })
      .catch((e: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setFetched([]);
        setError(e instanceof Error ? e.message : '検索に失敗しました。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [keyword, lat, lng, radius, usingSampleData, nonce]);

  const results = useMemo(() => applyFilters(fetched, filters), [fetched, filters]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return {
    results,
    fetched,
    loading,
    error,
    usingSampleData,
    refresh,
  };
}
