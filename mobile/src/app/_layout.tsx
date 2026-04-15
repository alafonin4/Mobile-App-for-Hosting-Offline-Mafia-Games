import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { palette } from '@/constants/theme';
import { RouteGuard, SessionProvider, useSession } from '@/utils/session';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootNavigator() {
  const { loading } = useSession();

  if (loading) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: palette.sand,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={palette.blue} size="large" />
      </View>
    );
  }

  return (
    <>
      <RouteGuard />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.cream },
          headerTintColor: palette.ink,
          contentStyle: { backgroundColor: palette.sand },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lobby/[roomId]" options={{ headerShown: false }} />
        <Stack.Screen name="game/[roomId]" options={{ headerShown: false }} />
        <Stack.Screen name="history-details/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}