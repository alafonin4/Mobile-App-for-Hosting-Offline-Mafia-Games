import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { useSession } from '@/utils/session';

export function NotificationHeaderButton() {
  const { api, session } = useSession();
  const { colors } = useAppTheme();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!session.userId) {
        return;
      }
      try {
        const notifications = await api.getNotifications();
        if (!cancelled) {
          setUnreadCount(notifications.filter((notification) => !notification.read && notification.active).length);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [api, pathname, session.userId]);

  return (
    <Pressable onPress={() => router.push('/notifications' as never)} style={styles.button}>
      <Ionicons name="notifications-outline" size={22} color={colors.text} />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={[styles.badgeText, { color: colors.badgeText }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
  },
  badge: {
    alignItems: 'center',
    borderRadius: 9,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -8,
    top: -6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
