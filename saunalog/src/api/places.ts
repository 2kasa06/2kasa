import { categorize } from '@/lib/category';
import { haversineMeters } from '@/lib/geo';
import type { LatLng, PriceLevel, Sauna } from '@/types';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/**
 * 取得するフィールド。Places API (New) は FieldMask で課金が変わるので、
 * 一覧に必要なものだけを挙げている。項目を足すと請求も上がる点に注意。
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.types',
  'places.photos',
  'places.currentOpeningHours.openNow',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.nationalPhoneNumber',
  'places.websiteUri',
].join(',');

export function getApiKey(): string | null {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? null;
}

export interface SearchOptions {
  /** ユーザーが入力したキーワード。空なら現在地周辺のサウナ全般。 */
  keyword?: string;
  center?: LatLng | null;
  radiusMeters: number;
  /** Places 側でも絞ると転送量と件数が減る。0 なら指定しない。 */
  minRating?: number;
  openNow?: boolean;
  maxResults?: number;
  signal?: AbortSignal;
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  photos?: { name?: string }[];
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

const PRICE_LEVELS: PriceLevel[] = [
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];

function toPriceLevel(value: string | undefined): PriceLevel | null {
  if (!value) return null;
  return (PRICE_LEVELS as string[]).includes(value) ? (value as PriceLevel) : null;
}

export function normalizePlace(raw: RawPlace, center: LatLng | null): Sauna | null {
  const id = raw.id;
  const name = raw.displayName?.text;
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  if (!id || !name || lat == null || lng == null) return null;

  const location: LatLng = { latitude: lat, longitude: lng };
  const types = raw.types ?? [];

  return {
    id,
    name,
    address: raw.formattedAddress ?? '',
    location,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    reviewCount: raw.userRatingCount ?? 0,
    openNow: raw.currentOpeningHours?.openNow ?? null,
    priceLevel: toPriceLevel(raw.priceLevel),
    photoName: raw.photos?.[0]?.name ?? null,
    category: categorize(name, types),
    types,
    phone: raw.nationalPhoneNumber ?? null,
    website: raw.websiteUri ?? null,
    weekdayHours: raw.regularOpeningHours?.weekdayDescriptions ?? [],
    distanceMeters: center ? haversineMeters(center, location) : null,
  };
}

/** Places の写真リソース名から表示用URLを組み立てる。 */
export function buildPhotoUrl(photoName: string, maxWidthPx = 640): string | null {
  const key = getApiKey();
  if (!key) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?key=${encodeURIComponent(
    key,
  )}&maxWidthPx=${maxWidthPx}&skipHttpRedirect=false`;
}

export class PlacesError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PlacesError';
  }
}

/**
 * サウナを検索する。Places には sauna 型が無いので、キーワードに「サウナ」を必ず混ぜ、
 * 取得後に店名・types からこのアプリのカテゴリへ寄せている。
 */
export async function searchSaunas(options: SearchOptions): Promise<Sauna[]> {
  const key = getApiKey();
  if (!key) {
    throw new PlacesError('Google Places の APIキーが設定されていません。');
  }

  const keyword = options.keyword?.trim();
  const textQuery = keyword ? `${keyword} サウナ` : 'サウナ';

  const body: Record<string, unknown> = {
    textQuery,
    languageCode: 'ja',
    regionCode: 'JP',
    maxResultCount: Math.min(options.maxResults ?? 20, 20),
  };

  if (options.center) {
    body.locationBias = {
      circle: {
        center: options.center,
        // Places の circle は半径50km までしか受け付けない。
        radius: Math.min(options.radiusMeters, 50000),
      },
    };
  }
  if (options.openNow) body.openNow = true;
  if (options.minRating && options.minRating > 0) body.minRating = options.minRating;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new PlacesError(
      `Places API がエラーを返しました (${res.status}) ${detail.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as { places?: RawPlace[] };
  const center = options.center ?? null;
  return (json.places ?? [])
    .map((p) => normalizePlace(p, center))
    .filter((s): s is Sauna => s !== null);
}
