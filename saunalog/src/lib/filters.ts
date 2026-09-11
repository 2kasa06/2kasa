import type { PriceLevel, Sauna, SaunaCategory } from '@/types';

export type SortKey = 'recommended' | 'rating' | 'distance' | 'reviews';

export interface SaunaFilters {
  /** 半径（メートル）。現在地が取れているときだけ効く。 */
  radiusMeters: number;
  /** この評価未満を除外する。0 なら未指定。 */
  minRating: number;
  openNowOnly: boolean;
  /** 空配列はすべて許可。 */
  categories: SaunaCategory[];
  /** 空配列はすべて許可。 */
  priceLevels: PriceLevel[];
  sort: SortKey;
}

export const RADIUS_OPTIONS = [1000, 3000, 5000, 10000, 30000] as const;
export const RATING_OPTIONS = [0, 3, 3.5, 4] as const;

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'おすすめ順',
  rating: '評価が高い順',
  distance: '近い順',
  reviews: '口コミが多い順',
};

export const DEFAULT_FILTERS: SaunaFilters = {
  radiusMeters: 5000,
  minRating: 0,
  openNowOnly: false,
  categories: [],
  priceLevels: [],
  sort: 'recommended',
};

/** 絞り込みバッジに出す「適用中の条件数」。並び替えは条件に数えない。 */
export function countActiveFilters(f: SaunaFilters): number {
  let n = 0;
  if (f.radiusMeters !== DEFAULT_FILTERS.radiusMeters) n += 1;
  if (f.minRating > 0) n += 1;
  if (f.openNowOnly) n += 1;
  if (f.categories.length > 0) n += 1;
  if (f.priceLevels.length > 0) n += 1;
  return n;
}

/**
 * おすすめ順のスコア。口コミ1件で星5の店が上に来ないよう、
 * 全体平均 C に寄せるベイズ平均を使う（m 件ぶんの「平均票」を足す）。
 */
const PRIOR_COUNT = 20;
const PRIOR_RATING = 3.4;

export function recommendScore(s: Sauna): number {
  const v = s.reviewCount;
  const r = s.rating ?? PRIOR_RATING;
  return (v * r + PRIOR_COUNT * PRIOR_RATING) / (v + PRIOR_COUNT);
}

/** 絞り込みのみ。並び替えは `sortSaunas()`。 */
export function filterSaunas(items: Sauna[], f: SaunaFilters): Sauna[] {
  return items.filter((s) => {
    if (s.distanceMeters != null && s.distanceMeters > f.radiusMeters) return false;
    if (f.minRating > 0 && (s.rating ?? 0) < f.minRating) return false;
    // 営業時間が非公開（null）の施設は「営業中のみ」で落とす。
    if (f.openNowOnly && s.openNow !== true) return false;
    if (f.categories.length > 0 && !f.categories.includes(s.category)) return false;
    if (f.priceLevels.length > 0 && (s.priceLevel == null || !f.priceLevels.includes(s.priceLevel))) {
      return false;
    }
    return true;
  });
}

export function sortSaunas(items: Sauna[], sort: SortKey): Sauna[] {
  const sorted = [...items];
  switch (sort) {
    case 'rating':
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
      break;
    case 'reviews':
      sorted.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
    case 'distance':
      sorted.sort(
        (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
      );
      break;
    case 'recommended':
    default:
      sorted.sort((a, b) => recommendScore(b) - recommendScore(a));
      break;
  }
  return sorted;
}

export function applyFilters(items: Sauna[], f: SaunaFilters): Sauna[] {
  return sortSaunas(filterSaunas(items, f), f.sort);
}
