/** Places API (New) の価格帯。 */
export type PriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

/** 施設の種別。Places には「サウナ」型が無いので店名と types から推定する。 */
export type SaunaCategory = 'sauna' | 'sento' | 'super_sento' | 'hotel' | 'spa' | 'other';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** アプリ内で扱う施設。Places のレスポンスをこの形に正規化する。 */
export interface Sauna {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  /** 未評価の施設は null。 */
  rating: number | null;
  reviewCount: number;
  /** 営業時間が非公開の施設は null。 */
  openNow: boolean | null;
  priceLevel: PriceLevel | null;
  /** Places の photo resource name。`buildPhotoUrl()` に渡す。 */
  photoName: string | null;
  category: SaunaCategory;
  types: string[];
  phone: string | null;
  website: string | null;
  weekdayHours: string[];
  /** 検索地点からの直線距離。位置情報が無い場合は null。 */
  distanceMeters: number | null;
}

export const CATEGORY_LABELS: Record<SaunaCategory, string> = {
  sauna: 'サウナ専門',
  sento: '銭湯',
  super_sento: 'スーパー銭湯',
  hotel: 'ホテル・カプセル',
  spa: 'スパ・温泉',
  other: 'その他',
};

export const PRICE_LABELS: Record<PriceLevel, string> = {
  PRICE_LEVEL_FREE: '無料',
  PRICE_LEVEL_INEXPENSIVE: '〜¥1,000',
  PRICE_LEVEL_MODERATE: '¥1,000〜¥3,000',
  PRICE_LEVEL_EXPENSIVE: '¥3,000〜¥6,000',
  PRICE_LEVEL_VERY_EXPENSIVE: '¥6,000〜',
};
