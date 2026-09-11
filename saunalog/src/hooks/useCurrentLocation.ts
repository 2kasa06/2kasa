import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

import type { LatLng } from '@/types';

/** 位置情報が取れなかったときの既定地点（東京駅）。 */
export const FALLBACK_CENTER: LatLng = { latitude: 35.6812, longitude: 139.7671 };

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

export interface CurrentLocation {
  center: LatLng;
  /** 実際に端末の位置が取れているか。false なら FALLBACK_CENTER を指している。 */
  isPrecise: boolean;
  status: LocationStatus;
  request: () => Promise<void>;
}

export function useCurrentLocation(): CurrentLocation {
  const [center, setCenter] = useState<LatLng>(FALLBACK_CENTER);
  const [isPrecise, setIsPrecise] = useState(false);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(async () => {
    setStatus('loading');
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== Location.PermissionStatus.GRANTED) {
        setStatus('denied');
        return;
      }
      // 直近の測位があればまず即座に反映し、精度の高い値は後から上書きする。
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setCenter({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        setIsPrecise(true);
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCenter({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setIsPrecise(true);
      setStatus('granted');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void request();
  }, [request]);

  return { center, isPrecise, status, request };
}
