import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type AppNotification } from '@/utils/api';
import { useSession } from '@/utils/session';

export default function NotificationsScreen() {
  const { api } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const nextNotifications = await api.getNotifications();
      setNotifications(nextNotifications);
      await api.markAllNotificationsRead();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load notifications');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  async function joinGame(notificationId: number) {
    try {
      const room = await api.joinGameFromNotification(notificationId);
      router.replace(`/lobby/${room.roomId}`);
    } catch (error) {
      Alert.alert('Join failed', error instanceof Error ? error.message : 'Cannot join this game');
      await loadNotifications();
    }
  }

  return (
    <Screen scroll>
      <SectionCard>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Friend requests, approvals, and game invitations.</Text>
      </SectionCard>

      {loading ? (
        <SectionCard>
          <ActivityIndicator color={palette.blue} />
        </SectionCard>
      ) : notifications.length ? (
        notifications.map((notification) => (
          <SectionCard key={notification.id}>
            <Text style={styles.cardTitle}>{notification.title}</Text>
            <Text style={styles.message}>{notification.message}</Text>
            <Text style={styles.meta}>
              {notification.active ? 'Active' : 'Inactive'} | {formatCreatedAt(notification.createdAt)}
            </Text>
            {notification.type === 'GAME_INVITE' ? (
              <Button
                label={notification.active ? 'Join' : 'Invitation expired'}
                onPress={() => void joinGame(notification.id)}
                disabled={!notification.active}
              />
            ) : null}
          </SectionCard>
        ))
      ) : (
        <SectionCard>
          <Text style={styles.message}>No notifications yet.</Text>
        </SectionCard>
      )}
    </Screen>
  );
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: palette.muted,
    fontSize: 12,
  },
});
