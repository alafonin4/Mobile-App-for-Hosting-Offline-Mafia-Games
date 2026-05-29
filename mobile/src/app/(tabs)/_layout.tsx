import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { NotificationHeaderButton } from '@/components/notification-header-button';
import { useAppTheme } from '@/theme';
import { useLocalization } from '@/utils/localization';

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const { t } = useLocalization();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        headerRight: () => <NotificationHeaderButton />,
        headerRightContainerStyle: { paddingRight: 4 },
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveBackgroundColor: colors.background,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: 74,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '700',
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="rating"
        options={{
          title: t('tabs.salon'),
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="friends"
        options={{
          title: t('tabs.circle'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="games"
        options={{
          title: t('tabs.tables'),
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.archive'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="roles"
        options={{
          title: t('tabs.roleGallery'),
          tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="clubs"
        options={{
          title: t('tabs.clubs'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
