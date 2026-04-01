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
import { type GameRoom } from '@/utils/api';
import { useGameEvents } from '@/utils/game-socket';
import { useSession } from '@/utils/session';

export default function LobbyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { api, session } = useSession();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

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

  if (loading || !room) {
    return (
      <Screen>
        <ActivityIndicator color={palette.blue} size="large" />
      </Screen>
    );
  }

  const currentPlayer = room.players.find((player) => player.userId === session.userId);
  const isHost = Boolean(currentPlayer?.host);

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
        <Button label="Show QR code" tone="secondary" onPress={() => setQrVisible(true)} />
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
            <QRCode value={room.roomId} size={220} />
            <Text style={styles.caption}>{room.roomId}</Text>
            <Button label="Close" tone="secondary" onPress={() => setQrVisible(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
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
  caption: {
    color: palette.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
