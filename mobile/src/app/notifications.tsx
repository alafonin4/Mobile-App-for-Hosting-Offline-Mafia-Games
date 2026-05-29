import { useFocusEffect } from '@react-navigation/native';
import { type Href, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type AppNotification } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function NotificationsScreen() {
  const { api } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
    hero: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.accent,
      borderWidth: 1,
    },
    eyebrow: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.text,
      fontSize: 26,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
    message: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 21,
    },
    meta: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
  }));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const nextNotifications = await api.getNotifications();
      setNotifications(nextNotifications);
      await api.markAllNotificationsRead();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('notifications.cannotLoad'));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  async function joinGame(notificationId: number) {
    try {
      const room = await api.joinGameFromNotification(notificationId);
      router.replace(`/lobby/${room.roomId}` as never);
    } catch (error) {
      Alert.alert(t('common.joinFailed'), error instanceof Error ? error.message : t('notifications.cannotJoinGame'));
      await loadNotifications();
    }
  }

  async function joinClub(notificationId: number) {
    try {
      const club = await api.joinClubFromNotification(notificationId);
      router.push(`/clubs/${club.id}` as Href);
    } catch (error) {
      Alert.alert(t('common.joinFailed'), error instanceof Error ? error.message : t('notifications.cannotJoinClub'));
      await loadNotifications();
    }
  }

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('notifications.eyebrow')}</Text>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        <Text style={styles.subtitle}>{t('notifications.copy')}</Text>
      </SectionCard>

      {loading ? (
        <SectionCard>
          <ActivityIndicator color={colors.primary} />
        </SectionCard>
      ) : notifications.length ? (
        notifications.map((notification) => (
          <SectionCard key={notification.id}>
            <Text style={styles.cardTitle}>{notification.title}</Text>
            <Text style={styles.message}>{notification.message}</Text>
            <Text style={styles.meta}>{notification.active ? t('common.active') : t('common.closed')} / {formatCreatedAt(notification.createdAt)}</Text>
            {notification.type === 'GAME_INVITE' ? (
              <Button
                label={notification.active ? t('notifications.joinRoom') : t('notifications.expired')}
                onPress={() => void joinGame(notification.id)}
                disabled={!notification.active}
              />
            ) : null}
            {notification.type === 'CLUB_INVITE' ? (
              <Button
                label={notification.active ? t('notifications.joinClub') : t('notifications.expired')}
                onPress={() => void joinClub(notification.id)}
                disabled={!notification.active}
              />
            ) : null}
          </SectionCard>
        ))
      ) : (
        <SectionCard>
          <Text style={styles.message}>{t('notifications.empty')}</Text>
        </SectionCard>
      )}
    </Screen>
  );
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
