import { categorize } from '@/lib/category';
import { haversineMeters } from '@/lib/geo';
import type { LatLng, PriceLevel, Sauna } from '@/types';

/**
 * APIキーが無いときに使うサンプルデータ。
 * 実在の施設の評価を捏造しないよう、店名・座標とも架空のものにしてある。
 */
interface Seed {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  reviewCount: number;
  openNow: boolean | null;
  priceLevel: PriceLevel | null;
  types: string[];
  hours: string[];
}

const SEEDS: Seed[] = [
  {
    id: 'mock-001',
    name: 'サウナ 蒸気堂 神保町',
    address: '東京都千代田区神保町1-0-0',
    latitude: 35.6959,
    longitude: 139.7576,
    rating: 4.5,
    reviewCount: 812,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    types: ['spa', 'point_of_interest'],
    hours: ['月曜日: 11:00～23:00', '火曜日: 11:00～23:00', '水曜日: 定休日'],
  },
  {
    id: 'mock-002',
    name: '錦糸町 さくら湯',
    address: '東京都墨田区錦糸2-0-0',
    latitude: 35.6975,
    longitude: 139.8145,
    rating: 4.1,
    reviewCount: 233,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    types: ['public_bath'],
    hours: ['毎日: 15:00～24:00'],
  },
  {
    id: 'mock-003',
    name: 'スーパー銭湯 湯けむりの里 大井町',
    address: '東京都品川区大井1-0-0',
    latitude: 35.6062,
    longitude: 139.7346,
    rating: 3.9,
    reviewCount: 1540,
    openNow: false,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    types: ['spa'],
    hours: ['毎日: 10:00～25:00'],
  },
  {
    id: 'mock-004',
    name: 'カプセルホテル&サウナ ロウリュ新橋',
    address: '東京都港区新橋3-0-0',
    latitude: 35.6666,
    longitude: 139.7583,
    rating: 4.3,
    reviewCount: 97,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    types: ['lodging', 'spa'],
    hours: ['24時間営業'],
  },
  {
    id: 'mock-005',
    name: 'サウナ アウフグース高円寺',
    address: '東京都杉並区高円寺北3-0-0',
    latitude: 35.7056,
    longitude: 139.6497,
    rating: 4.8,
    reviewCount: 12,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    types: ['spa'],
    hours: ['火〜日: 12:00～23:00'],
  },
  {
    id: 'mock-006',
    name: '天然温泉 ととのい湯 豊洲',
    address: '東京都江東区豊洲2-0-0',
    latitude: 35.6551,
    longitude: 139.7967,
    rating: 4.0,
    reviewCount: 2210,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_VERY_EXPENSIVE',
    types: ['spa', 'tourist_attraction'],
    hours: ['毎日: 11:00～翌9:00'],
  },
  {
    id: 'mock-007',
    name: '目黒 水風呂銭湯 松の湯',
    address: '東京都目黒区下目黒4-0-0',
    latitude: 35.6289,
    longitude: 139.7051,
    rating: 3.6,
    reviewCount: 68,
    openNow: null,
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    types: ['public_bath'],
    hours: [],
  },
  {
    id: 'mock-008',
    name: 'サウナラボ 中野',
    address: '東京都中野区中野5-0-0',
    latitude: 35.7075,
    longitude: 139.6657,
    rating: 4.6,
    reviewCount: 430,
    openNow: false,
    priceLevel: 'PRICE_LEVEL_EXPENSIVE',
    types: ['spa'],
    hours: ['毎日: 13:00～23:00'],
  },
  {
    id: 'mock-009',
    name: '吉祥寺 ヴィヒタの森サウナ',
    address: '東京都武蔵野市吉祥寺本町2-0-0',
    latitude: 35.7038,
    longitude: 139.5794,
    rating: 4.2,
    reviewCount: 305,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    types: ['spa'],
    hours: ['毎日: 10:00～24:00'],
  },
  {
    id: 'mock-010',
    name: '健康ランド 湯楽園 赤羽',
    address: '東京都北区赤羽1-0-0',
    latitude: 35.7778,
    longitude: 139.7207,
    rating: 3.4,
    reviewCount: 880,
    openNow: true,
    priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
    types: ['spa'],
    hours: ['24時間営業'],
  },
  {
    id: 'mock-011',
    name: '渋谷 ドライサウナ 熱波館',
    address: '東京都渋谷区道玄坂2-0-0',
    latitude: 35.6581,
    longitude: 139.6975,
    rating: null,
    reviewCount: 0,
    openNow: true,
    priceLevel: null,
    types: ['spa'],
    hours: [],
  },
  {
    id: 'mock-012',
    name: '上野 サウナ&カプセル 白樺',
    address: '東京都台東区上野6-0-0',
    latitude: 35.7078,
    longitude: 139.7743,
    rating: 4.4,
    reviewCount: 1120,
    openNow: false,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    types: ['lodging', 'spa'],
    hours: ['24時間営業'],
  },
];

/** サンプルデータを、検索地点からの距離付きで返す。 */
export function mockSaunas(center: LatLng | null): Sauna[] {
  return SEEDS.map((s) => {
    const location: LatLng = { latitude: s.latitude, longitude: s.longitude };
    return {
      id: s.id,
      name: s.name,
      address: s.address,
      location,
      rating: s.rating,
      reviewCount: s.reviewCount,
      openNow: s.openNow,
      priceLevel: s.priceLevel,
      photoName: null,
      category: categorize(s.name, s.types),
      types: s.types,
      phone: null,
      website: null,
      weekdayHours: s.hours,
      distanceMeters: center ? haversineMeters(center, location) : null,
    };
  });
}

/** サンプルデータ側のキーワード検索。店名と住所の部分一致。 */
export function filterMockByKeyword(items: Sauna[], keyword: string): Sauna[] {
  const q = keyword.trim();
  if (!q) return items;
  return items.filter((s) => s.name.includes(q) || s.address.includes(q));
}
