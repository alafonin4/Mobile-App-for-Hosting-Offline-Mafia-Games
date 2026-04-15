import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { VoteRoundCard } from '@/components/vote-round-card';
import { palette } from '@/constants/theme';
import { type GameRoom } from '@/utils/api';
import { useGameEvents } from '@/utils/game-socket';
import { useSession } from '@/utils/session';

const TIMER_PRESETS = {
  speech: 60,
  discussion: 180,
} as const;

function formatTimer(value: number) {
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatRoleLabel(role: string | null, variant: string | null) {
  if (!role) {
    return 'Role hidden';
  }
  if (!variant || variant === 'DEFAULT') {
    return role;
  }
  return `${role} (${variant})`;
}

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { api, session } = useSession();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [lastPrivateEvent, setLastPrivateEvent] = useState('');
  const hasHandledFinishRef = useRef(false);
  const [selectedTimer, setSelectedTimer] = useState<keyof typeof TIMER_PRESETS>('speech');
  const [timerDuration, setTimerDuration] = useState<number>(TIMER_PRESETS.speech);
  const [timeLeft, setTimeLeft] = useState<number>(TIMER_PRESETS.speech);
  const [timerRunning, setTimerRunning] = useState(false);

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

  useEffect(() => {
    hasHandledFinishRef.current = false;
  }, [roomId]);

  useEffect(() => {
    setSelectedTimer('speech');
    setTimerDuration(TIMER_PRESETS.speech);
    setTimeLeft(TIMER_PRESETS.speech);
    setTimerRunning(false);
  }, [roomId]);

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

  useEffect(() => {
    if (!room || room.phase !== 'FINISHED' || hasHandledFinishRef.current) {
      return;
    }

    hasHandledFinishRef.current = true;
    Alert.alert('Game finished', `Winner: ${room.winner}`, [
      {
        text: 'History',
        onPress: () => router.replace('/history'),
      },
      {
        text: 'Games',
        onPress: () => router.replace('/games'),
      },
    ]);
  }, [room]);

  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    if (timerRunning && timeLeft === 0) {
      setTimerRunning(false);
    }
  }, [timeLeft, timerRunning]);

  if (!room) {
    return (
      <Screen>
        <ActivityIndicator color={palette.blue} size="large" />
      </Screen>
    );
  }

  const alivePlayers = room.players.filter((player) => player.status === 'ALIVE');
  const currentPlayer = room.players.find((player) => player.userId === session.userId);
  const isHost = Boolean(currentPlayer?.host);
  const moderatorPlayers = room.players.filter((player) => !player.host);

  function applyTimerPreset(timerKey: keyof typeof TIMER_PRESETS) {
    const nextDuration = TIMER_PRESETS[timerKey];
    setSelectedTimer(timerKey);
    setTimerDuration(nextDuration);
    setTimeLeft(nextDuration);
    setTimerRunning(false);
  }

  function toggleTimer() {
    if (timeLeft === 0) {
      setTimeLeft(timerDuration);
    }
    setTimerRunning((current) => !current);
  }

  function resetTimer() {
    setTimeLeft(timerDuration);
    setTimerRunning(false);
  }

  if (room.phase === 'FINISHED') {
    return (
      <Screen>
        <SectionCard>
          <Text style={styles.title}>{room.name}</Text>
          <Text style={styles.meta}>Game finished</Text>
          <Text style={styles.meta}>Winner: {room.winner}</Text>
          <Text style={styles.meta}>Night: {room.nightNumber}</Text>
          <Text style={styles.meta}>Day: {room.dayNumber}</Text>
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

        <Button label="Open history" onPress={() => router.replace('/history')} />
        <Button label="Back to games" tone="secondary" onPress={() => router.replace('/games')} />
      </Screen>
    );
  }

  if (isHost) {
    return (
      <Screen scroll>
        <SectionCard>
          <Text style={styles.title}>{room.name}</Text>
          <Text style={styles.meta}>Phase: {room.phase}</Text>
          <Text style={styles.meta}>Night: {room.nightNumber}</Text>
          <Text style={styles.meta}>Day: {room.dayNumber}</Text>
          <Text style={styles.meta}>Mode: Moderator</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>Moderator timer</Text>
          <Text style={styles.timerLabel}>
            {selectedTimer === 'speech' ? 'Player speech' : 'Discussion'}
          </Text>
          <Text style={[styles.timerValue, timeLeft === 0 && styles.timerValueExpired]}>
            {formatTimer(timeLeft)}
          </Text>
          <View style={styles.timerRow}>
            <Button
              label="Speech 01:00"
              tone={selectedTimer === 'speech' ? 'primary' : 'secondary'}
              onPress={() => applyTimerPreset('speech')}
            />
            <Button
              label="Discussion 03:00"
              tone={selectedTimer === 'discussion' ? 'primary' : 'secondary'}
              onPress={() => applyTimerPreset('discussion')}
            />
          </View>
          <View style={styles.timerRow}>
            <Button label={timerRunning ? 'Pause' : 'Start'} onPress={toggleTimer} />
            <Button label="Reset" tone="secondary" onPress={resetTimer} />
          </View>
          {timeLeft === 0 ? <Text style={styles.timerExpired}>Time is up.</Text> : null}
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>Players and roles</Text>
          <Text style={styles.meta}>Red cards are mafia roles. Green cards are everyone else.</Text>
          {moderatorPlayers.map((player) => (
            <PlayerCard
              key={player.userId}
              title={player.email}
              subtitle={`${player.status} | ${formatRoleLabel(player.visibleRole, player.visibleVariant)}`}
              style={player.visibleFaction === 'MAFIA' ? styles.mafiaPlayerCard : styles.townPlayerCard}
            />
          ))}
        </SectionCard>

        {room.activeVoteRound ? (
          <SectionCard>
            <Text style={styles.title}>Vote round</Text>
            <VoteRoundCard voteRound={room.activeVoteRound} />
          </SectionCard>
        ) : null}
      </Screen>
    );
  }

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
  timerLabel: {
    color: palette.muted,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  timerValue: {
    color: palette.ink,
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerValueExpired: {
    color: palette.danger,
  },
  timerRow: {
    gap: 12,
  },
  timerExpired: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  mafiaPlayerCard: {
    backgroundColor: '#f2cdca',
    borderColor: palette.danger,
  },
  townPlayerCard: {
    backgroundColor: '#d7ebe3',
    borderColor: palette.mint,
  },
});
