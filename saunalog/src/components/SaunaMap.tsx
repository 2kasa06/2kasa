import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { zoomForRadius } from '@/lib/geo';
import type { LatLng, Sauna } from '@/types';
import { colors, spacing } from '@/theme';

interface SaunaMapProps {
  saunas: Sauna[];
  center: LatLng;
  radiusMeters: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * 検索結果を地図に出す。iOS は Apple Maps、Android は Google Maps を使う。
 * どちらの実装も Expo が用意したネイティブビューで、Expo Go では動かない（開発ビルドが要る）。
 */
export function SaunaMap({ saunas, center, radiusMeters, selectedId, onSelect }: SaunaMapProps) {
  const cameraPosition = useMemo(
    () => ({
      coordinates: { latitude: center.latitude, longitude: center.longitude },
      zoom: zoomForRadius(radiusMeters, center.latitude),
    }),
    [center.latitude, center.longitude, radiusMeters],
  );

  if (Platform.OS === 'ios') {
    const markers: AppleMaps.Marker[] = saunas.map((s) => ({
      id: s.id,
      coordinates: s.location,
      title: s.name,
      systemImage: 'flame.fill',
      tintColor: s.id === selectedId ? colors.primary : colors.accent,
    }));

    return (
      <AppleMaps.View
        style={styles.map}
        cameraPosition={cameraPosition}
        markers={markers}
        properties={{ isMyLocationEnabled: true, selectionEnabled: true }}
        uiSettings={{ myLocationButtonEnabled: true, compassEnabled: true }}
        onMarkerClick={(marker) => onSelect(marker.id ?? null)}
        onMapClick={() => onSelect(null)}
      />
    );
  }

  if (Platform.OS === 'android') {
    const markers: GoogleMaps.Marker[] = saunas.map((s) => ({
      id: s.id,
      coordinates: s.location,
      title: s.name,
      snippet: s.rating != null ? `★${s.rating.toFixed(1)}` : '評価なし',
      showCallout: true,
    }));

    return (
      <GoogleMaps.View
        style={styles.map}
        cameraPosition={cameraPosition}
        markers={markers}
        properties={{ isMyLocationEnabled: true }}
        uiSettings={{ myLocationButtonEnabled: true, compassEnabled: true }}
        onMarkerClick={(marker) => onSelect(marker.id ?? null)}
        onMapClick={() => onSelect(null)}
      />
    );
  }

  return (
    <View style={[styles.map, styles.unsupported]}>
      <Text style={styles.unsupportedText}>地図は iOS と Android でのみ表示できます。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  unsupported: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceMuted,
  },
  unsupportedText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
