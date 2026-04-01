import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { VoteRoundCard } from '@/components/vote-round-card';
import { palette } from '@/constants/theme';
import { type GameRoom } from '@/utils/api';
import { useGameEvents } from '@/utils/game-socket';
import { useSession } from '@/utils/session';

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { api } = useSession();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [lastPrivateEvent, setLastPrivateEvent] = useState('');

  const loadRoom = useCallback(async () => {
    if (!roomId) {
      return;
    }
    try {
      setRoom(await api.getRoom(roomId));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load game room');
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
    if (event.type.endsWith('_RESULT') || event.type === 'ROLE_ASSIGNED') {
      setLastPrivateEvent(JSON.stringify(event.payload));
      void loadRoom();
      return;
    }
    void loadRoom();
  });

  if (!room) {
    return (
      <Screen>
        <ActivityIndicator color={palette.blue} size="large" />
      </Screen>
    );
  }

  const alivePlayers = room.players.filter((player) => player.status === 'ALIVE');

  async function sendAction() {
    const currentRoom = room;
    if (!currentRoom) {
      return;
    }

    try {
      if (currentRoom.phase === 'DAY_VOTING') {
        if (!selectedTarget) {
          return;
        }
        setRoom(await api.submitDayVote(currentRoom.roomId, { targetUserId: selectedTarget }));
        return;
      }

      if (currentRoom.phase === 'NIGHT_ACTIONS' && selectedAction) {
        setRoom(
          await api.submitNightAction(currentRoom.roomId, {
            targetUserId: selectedTarget,
            actionCode: selectedAction,
          }),
        );
      }
    } catch (error) {
      Alert.alert('Action failed', error instanceof Error ? error.message : 'Cannot submit action');
    }
  }

  return (
    <Screen scroll>
      <SectionCard>
        <Text style={styles.title}>{room.name}</Text>
        <Text style={styles.meta}>Phase: {room.phase}</Text>
        <Text style={styles.meta}>Night: {room.nightNumber}</Text>
        <Text style={styles.meta}>Day: {room.dayNumber}</Text>
        <Text style={styles.meta}>Your role: {room.currentUserRole ?? 'Hidden'}</Text>
        {lastPrivateEvent ? <Text style={styles.privateInfo}>{lastPrivateEvent}</Text> : null}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Players</Text>
        {room.players.map((player) => (
          <PlayerCard
            key={player.userId}
            title={player.email}
            subtitle={`${player.status}${player.visibleRole ? ` | ${player.visibleRole}` : ''}`}
            highlight={player.host}
          />
        ))}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Actions</Text>
        {room.currentUserActions.length ? (
          room.currentUserActions.map((action) => (
            <Button
              key={action.slotId}
              label={`${selectedAction === action.actionCode ? 'Selected: ' : ''}${action.actionCode}`}
              tone={selectedAction === action.actionCode ? 'primary' : 'secondary'}
              onPress={() => setSelectedAction(action.actionCode)}
            />
          ))
        ) : (
          <Text style={styles.meta}>No actions available right now.</Text>
        )}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Target</Text>
        {alivePlayers.map((player) => (
          <Button
            key={player.userId}
            label={`${selectedTarget === player.userId ? 'Selected: ' : ''}${player.email}`}
            tone={selectedTarget === player.userId ? 'primary' : 'secondary'}
            onPress={() => setSelectedTarget(player.userId)}
          />
        ))}
        {room.phase === 'NIGHT_ACTIONS' ? (
          <Button label="Skip target" tone="secondary" onPress={() => setSelectedTarget(null)} />
        ) : null}
      </SectionCard>

      {room.activeVoteRound ? (
        <SectionCard>
          <Text style={styles.title}>Vote round</Text>
          <VoteRoundCard voteRound={room.activeVoteRound} />
        </SectionCard>
      ) : null}

      <Button
        label="Submit action"
        onPress={() => void sendAction()}
        disabled={room.phase === 'NIGHT_ACTIONS' ? !selectedAction : !selectedTarget}
      />
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
  privateInfo: {
    color: palette.blue,
    lineHeight: 20,
  },
});
