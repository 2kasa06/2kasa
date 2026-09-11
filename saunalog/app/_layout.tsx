import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" options={{ title: 'サウナログ' }} />
        <Stack.Screen name="sauna/[id]" options={{ title: '施設情報' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
