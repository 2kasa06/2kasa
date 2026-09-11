import type { LatLng } from '@/types';

const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 2地点間の直線距離（メートル）。 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 「1.2km」「350m」のような表示用文字列。 */
export function formatDistance(meters: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** Web メルカトルのズーム0における赤道上の解像度（m/px）。 */
const METERS_PER_PIXEL_AT_ZOOM_0 = 156543.03392;

/**
 * 検索半径がちょうど画面に収まるズーム値を求める。
 * 円の直径に少し余白（10%）を足した幅が viewportPx に収まる倍率を逆算している。
 */
export function zoomForRadius(radiusMeters: number, latitude: number, viewportPx = 320): number {
  if (radiusMeters <= 0 || viewportPx <= 0) return 12;
  const metersPerPixel = (radiusMeters * 2 * 1.1) / viewportPx;
  const scale = (METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos((latitude * Math.PI) / 180)) / metersPerPixel;
  const zoom = Math.log2(scale);
  return Math.min(18, Math.max(3, Number(zoom.toFixed(2))));
}
