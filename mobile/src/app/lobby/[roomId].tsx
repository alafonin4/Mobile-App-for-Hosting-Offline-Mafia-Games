import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/button';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type FriendRequest, type GameRoom } from '@/utils/api';
import { useGameEvents } from '@/utils/game-socket';
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
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load room');
    } finally {
      setLoading(false);
    }
  }, [api, roomId]);

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
      router.replace(`/game/${room.roomId}`);
    }
  }, [room]);

  const loadFriends = useCallback(async () => {
    try {
      setInviteLoading(true);
      const relations = await api.getFriends();
      setFriends(mapFriends(relations, session.userId));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load friends');
    } finally {
      setInviteLoading(false);
    }
  }, [api, session.userId]);

  useEffect(() => {
    if (inviteVisible) {
      void loadFriends();
    }
  }, [inviteVisible, loadFriends]);

  if (loading || !room) {
    return (
      <Screen>
        <ActivityIndicator color={palette.blue} size="large" />
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
          tintColor={palette.blue}
        />
      }
    >
      <SectionCard>
        <Text style={styles.title}>{room.name}</Text>
        <Text style={styles.meta}>Room ID: {room.roomId}</Text>
        <Text style={styles.meta}>
          Players: {room.players.length}/{room.configuredRoles.length}
        </Text>
        <Button label="Copy room ID" onPress={() => void Clipboard.setStringAsync(room.roomId)} />
        <Button label="Copy invite link" tone="secondary" onPress={() => void Clipboard.setStringAsync(inviteUrl)} />
        <Button label="Show QR code" tone="secondary" onPress={() => setQrVisible(true)} />
        {isHost ? (
          <Button label="Invite" tone="secondary" onPress={() => setInviteVisible(true)} />
        ) : null}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Players</Text>
        {room.players.map((player) => (
          <PlayerCard
            key={player.userId}
            title={player.email}
            subtitle={`${player.host ? 'Host' : 'Player'} | ${player.ready ? 'Ready' : 'Not ready'}`}
            highlight={player.host}
          />
        ))}
      </SectionCard>

      <Button label="Ready / Not ready" onPress={() => void api.toggleReady(room.roomId).then(setRoom)} />
      {isHost ? <Button label="Start game" tone="secondary" onPress={() => void api.startGame(room.roomId).then(setRoom)} /> : null}

      <Modal visible={qrVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.qrCard}>
            <Text style={styles.title}>Room QR</Text>
            <QRCode value={inviteUrl} size={220} />
            <Text style={styles.caption}>Scan with the Mafia Mobile app or your phone camera.</Text>
            <Text style={styles.caption}>{room.roomId}</Text>
            <Button label="Close" tone="secondary" onPress={() => setQrVisible(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={inviteVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.inviteCard}>
            <Text style={styles.title}>Invite friends</Text>
            {inviteLoading ? (
              <ActivityIndicator color={palette.blue} />
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
                      <Text style={styles.sentLabel}>In lobby</Text>
                    ) : invited ? (
                      <Text style={styles.sentLabel}>Sent</Text>
                    ) : (
                      <Button
                        label="Invite"
                        tone="secondary"
                        onPress={() => void api.inviteFriendToRoom(room.roomId, friend.id).then(setRoom)}
                      />
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.caption}>No approved friends yet.</Text>
            )}
            <Button label="Close" tone="secondary" onPress={() => setInviteVisible(false)} />
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

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    color: palette.ink,
    fontSize: 15,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 32, 49, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 24,
    gap: 16,
    padding: 24,
    width: '100%',
  },
  inviteCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
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
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  caption: {
    color: palette.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  sentLabel: {
    color: palette.mint,
    fontSize: 14,
    fontWeight: '700',
  },
});
