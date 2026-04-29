import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NotificationHeaderButton } from '@/components/notification-header-button';
import { RouteGuard, SessionProvider, useSession } from '@/utils/session';
import { ThemeProvider, useAppTheme, useThemedStyles } from '@/theme';

function RootNavigator() {
  const { loading } = useSession();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((theme) => ({
    loader: {
      alignItems: 'center',
      backgroundColor: theme.background,
      flex: 1,
      justifyContent: 'center',
    },
  }));

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <RouteGuard />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
          headerRight: () => <NotificationHeaderButton />,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lobby/[roomId]" options={{ title: 'Lobby' }} />
        <Stack.Screen name="game/[roomId]" options={{ title: 'Game' }} />
        <Stack.Screen name="history-details/[id]" options={{ title: 'History details' }} />
        <Stack.Screen name="users/[id]" options={{ title: 'Profile' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
