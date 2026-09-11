import assert from 'node:assert/strict';
import { test } from 'node:test';

import { categorize } from './category.ts';
import { formatDistance, haversineMeters } from './geo.ts';
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  filterSaunas,
  recommendScore,
  sortSaunas,
} from './filters.ts';
import type { Sauna } from '../types.ts';

function sauna(overrides: Partial<Sauna> & { id: string }): Sauna {
  return {
    name: 'サウナ テスト',
    address: '東京都',
    location: { latitude: 35.68, longitude: 139.76 },
    rating: 4,
    reviewCount: 100,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    photoName: null,
    category: 'sauna',
    types: [],
    phone: null,
    website: null,
    weekdayHours: [],
    distanceMeters: 500,
    ...overrides,
  };
}

test('距離が半径を超える施設は除外される', () => {
  const items = [
    sauna({ id: 'near', distanceMeters: 900 }),
    sauna({ id: 'far', distanceMeters: 9000 }),
  ];
  const got = filterSaunas(items, { ...DEFAULT_FILTERS, radiusMeters: 1000 });
  assert.deepEqual(got.map((s) => s.id), ['near']);
});

test('距離が不明な施設は半径で落とさない', () => {
  const items = [sauna({ id: 'unknown', distanceMeters: null })];
  const got = filterSaunas(items, { ...DEFAULT_FILTERS, radiusMeters: 1000 });
  assert.equal(got.length, 1);
});

test('営業中のみでは営業時間が非公開の施設も除外される', () => {
  const items = [
    sauna({ id: 'open', openNow: true }),
    sauna({ id: 'closed', openNow: false }),
    sauna({ id: 'unknown', openNow: null }),
  ];
  const got = filterSaunas(items, { ...DEFAULT_FILTERS, openNowOnly: true });
  assert.deepEqual(got.map((s) => s.id), ['open']);
});

test('評価なしの施設は最低評価の指定で除外される', () => {
  const items = [sauna({ id: 'unrated', rating: null }), sauna({ id: 'rated', rating: 4.2 })];
  const got = filterSaunas(items, { ...DEFAULT_FILTERS, minRating: 3.5 });
  assert.deepEqual(got.map((s) => s.id), ['rated']);
});

test('価格帯の指定時は価格不明の施設を除外する', () => {
  const items = [
    sauna({ id: 'priced', priceLevel: 'PRICE_LEVEL_INEXPENSIVE' }),
    sauna({ id: 'nopriced', priceLevel: null }),
  ];
  const got = filterSaunas(items, { ...DEFAULT_FILTERS, priceLevels: ['PRICE_LEVEL_INEXPENSIVE'] });
  assert.deepEqual(got.map((s) => s.id), ['priced']);
});

test('おすすめ順は口コミ1件の満点より、件数のある高評価を上に置く', () => {
  const items = [
    sauna({ id: 'lucky', rating: 5, reviewCount: 1 }),
    sauna({ id: 'solid', rating: 4.5, reviewCount: 800 }),
  ];
  const got = sortSaunas(items, 'recommended');
  assert.deepEqual(got.map((s) => s.id), ['solid', 'lucky']);
  assert.ok(recommendScore(items[1]) > recommendScore(items[0]));
});

test('近い順では距離不明の施設が末尾に回る', () => {
  const items = [
    sauna({ id: 'unknown', distanceMeters: null }),
    sauna({ id: 'far', distanceMeters: 3000 }),
    sauna({ id: 'near', distanceMeters: 200 }),
  ];
  const got = sortSaunas(items, 'distance');
  assert.deepEqual(got.map((s) => s.id), ['near', 'far', 'unknown']);
});

test('並び替えだけを変えても適用中の条件数は増えない', () => {
  assert.equal(countActiveFilters({ ...DEFAULT_FILTERS, sort: 'rating' }), 0);
  assert.equal(countActiveFilters({ ...DEFAULT_FILTERS, minRating: 4, openNowOnly: true }), 2);
});

test('applyFilters は絞り込みと並び替えを両方適用する', () => {
  const items = [
    sauna({ id: 'a', rating: 3.2, reviewCount: 500 }),
    sauna({ id: 'b', rating: 4.6, reviewCount: 500 }),
    sauna({ id: 'c', rating: 4.1, reviewCount: 500 }),
  ];
  const got = applyFilters(items, { ...DEFAULT_FILTERS, minRating: 3.5, sort: 'rating' });
  assert.deepEqual(got.map((s) => s.id), ['b', 'c']);
});

test('施設種別は店名と types から推定する', () => {
  assert.equal(categorize('サウナ 蒸気堂', ['spa']), 'sauna');
  assert.equal(categorize('スーパー銭湯 湯けむりの里', ['spa']), 'super_sento');
  assert.equal(categorize('カプセルホテル 白樺', ['lodging']), 'hotel');
  assert.equal(categorize('松の湯', ['public_bath']), 'sento');
  assert.equal(categorize('名もなき施設', []), 'other');
});

test('距離の計算と表示', () => {
  const tokyo = { latitude: 35.6812, longitude: 139.7671 };
  const shinagawa = { latitude: 35.6284, longitude: 139.7387 };
  const meters = haversineMeters(tokyo, shinagawa);
  assert.ok(meters > 6000 && meters < 7000, `想定外の距離: ${meters}`);
  assert.equal(formatDistance(340), '340m');
  assert.equal(formatDistance(1234), '1.2km');
  assert.equal(formatDistance(null), null);
});
