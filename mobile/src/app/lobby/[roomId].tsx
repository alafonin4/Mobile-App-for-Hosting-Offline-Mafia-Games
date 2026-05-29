import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/button';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type FriendRequest, type GameRoom } from '@/utils/api';
import { useGameEvents } from '@/utils/game-socket';
import { useLocalization } from '@/utils/localization';
import { buildRoomInviteUrl } from '@/utils/room-invite';
import { useSession } from '@/utils/session';

type LobbyFriend = {
  id: number;
  title: string;
  subtitle: string;
};

export default function LobbyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { api, session } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
    loader: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
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
      fontSize: 28,
      fontWeight: '800',
    },
    meta: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: theme.overlay,
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    qrCard: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 28,
      gap: 16,
      padding: 24,
      width: '100%',
    },
    inviteCard: {
      backgroundColor: theme.surface,
      borderRadius: 28,
      gap: 16,
      maxHeight: '80%',
      padding: 24,
      width: '100%',
    },
    inviteRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    inviteTextWrap: {
      flex: 1,
      gap: 4,
    },
    inviteTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
    },
    caption: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },
    sentLabel: {
      color: theme.success,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
  }));
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [friends, setFriends] = useState<LobbyFriend[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!roomId) {
      return;
    }
    try {
      setLoading(true);
      setRoom(await api.getRoom(roomId));
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('lobby.cannotLoadRoom'));
    } finally {
      setLoading(false);
    }
  }, [api, roomId, t]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useGameEvents(roomId ?? '', (event) => {
    if (event.type === 'ROOM_STATE_UPDATED' || event.type === 'GAME_FINISHED') {
      setRoom(event.payload as GameRoom);
      return;
    }
    void loadRoom();
  });

  useEffect(() => {
    if (room && room.phase !== 'LOBBY') {
      router.replace(`/game/${room.roomId}` as never);
    }
  }, [room]);

  const loadFriends = useCallback(async () => {
    try {
      setInviteLoading(true);
      const relations = await api.getFriends();
      setFriends(mapFriends(relations, session.userId));
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('lobby.cannotLoadFriends'));
    } finally {
      setInviteLoading(false);
    }
  }, [api, session.userId, t]);

  useEffect(() => {
    if (inviteVisible) {
      void loadFriends();
    }
  }, [inviteVisible, loadFriends]);

  if (loading || !room) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const currentPlayer = room.players.find((player) => player.userId === session.userId);
  const isHost = Boolean(currentPlayer?.host);
  const inviteUrl = buildRoomInviteUrl(room.roomId);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadRoom().finally(() => setRefreshing(false));
          }}
          tintColor={colors.primary}
        />
      }
    >
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('lobby.eyebrow')}</Text>
        <Text style={styles.title}>{room.name}</Text>
        <Text style={styles.meta}>{t('lobby.roomId')} {room.roomId}</Text>
        <Text style={styles.meta}>
          {t('lobby.seatsFilled')
            .replace('{filled}', String(room.players.length))
            .replace('{total}', String(room.configuredRoles.length))}
        </Text>
        <Button label={t('lobby.copyRoomId')} onPress={() => void Clipboard.setStringAsync(room.roomId)} />
        <Button label={t('lobby.copyInvite')} tone="secondary" onPress={() => void Clipboard.setStringAsync(inviteUrl)} />
        <Button label={t('lobby.showQr')} tone="secondary" onPress={() => setQrVisible(true)} />
        {isHost ? <Button label={t('lobby.inviteMembers')} tone="secondary" onPress={() => setInviteVisible(true)} /> : null}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>{t('lobby.guestList')}</Text>
        {room.players.map((player) => (
          <PlayerCard
            key={player.userId}
            title={player.email}
            subtitle={`${player.host ? t('common.host') : t('common.guest')} · ${player.ready ? t('common.ready') : t('common.waiting')}`}
            highlight={player.host}
          />
        ))}
      </SectionCard>

      <Button label={t('lobby.toggleReady')} onPress={() => void api.toggleReady(room.roomId).then(setRoom)} />
      {isHost ? <Button label={t('lobby.beginGame')} tone="secondary" onPress={() => void api.startGame(room.roomId).then(setRoom)} /> : null}

      <Modal visible={qrVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.qrCard}>
            <Text style={styles.title}>{t('lobby.roomInvitation')}</Text>
            <QRCode value={inviteUrl} size={220} />
            <Text style={styles.caption}>{t('lobby.qrCaption')}</Text>
            <Text style={styles.caption}>{room.roomId}</Text>
            <Button label={t('common.close')} tone="secondary" onPress={() => setQrVisible(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={inviteVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.inviteCard}>
            <Text style={styles.title}>{t('lobby.inviteFromCircle')}</Text>
            {inviteLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : friends.length ? (
              friends.map((friend) => {
                const inLobby = room.players.some((player) => player.userId === friend.id);
                const invited = room.invitedUserIds.includes(friend.id);
                return (
                  <View key={friend.id} style={styles.inviteRow}>
                    <View style={styles.inviteTextWrap}>
                      <Text style={styles.inviteTitle}>{friend.title}</Text>
                      <Text style={styles.caption}>{friend.subtitle}</Text>
                    </View>
                    {inLobby ? (
                      <Text style={styles.sentLabel}>{t('common.inside')}</Text>
                    ) : invited ? (
                      <Text style={styles.sentLabel}>{t('common.sent')}</Text>
                    ) : (
                      <Button
                        label={t('lobby.invite')}
                        tone="secondary"
                        onPress={() => void api.inviteFriendToRoom(room.roomId, friend.id).then(setRoom)}
                      />
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.caption}>{t('lobby.noFriends')}</Text>
            )}
            <Button label={t('common.close')} tone="secondary" onPress={() => setInviteVisible(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function mapFriends(items: FriendRequest[], currentUserId: number | null) {
  return items.map((item) => {
    const isSender = item.senderId === currentUserId;
    return {
      id: isSender ? item.receiverId : item.senderId,
      title: isSender ? item.receiverNickname || item.receiverEmail : item.senderNickname || item.senderEmail,
      subtitle: isSender ? item.receiverEmail : item.senderEmail,
    };
  });
}
