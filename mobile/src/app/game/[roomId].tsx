import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { VoteRoundCard } from '@/components/vote-round-card';
import { palette } from '@/constants/theme';
import { type GamePhase, type GameRoom, type RoomPlayer } from '@/utils/api';
import { useGameEvents } from '@/utils/game-socket';
import { useSession } from '@/utils/session';

const SPEECH_SECONDS = 60;
const SPEECH_EXTENSION_SECONDS = 15;
const DISCUSSION_EXTENSION_SECONDS = 30;
const DEFAULT_DISCUSSION_SECONDS = 180;
const QUEUED_DISCUSSION_BASE_SECONDS = 60;
const QUEUED_DISCUSSION_BONUS_SECONDS = 30;

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

function discussionSeconds(queueSize: number) {
  return queueSize === 0
    ? DEFAULT_DISCUSSION_SECONDS
    : QUEUED_DISCUSSION_BASE_SECONDS + queueSize * QUEUED_DISCUSSION_BONUS_SECONDS;
}

function queuePlayers(players: RoomPlayer[], queueUserIds: number[]) {
  return queueUserIds
    .map((userId) => players.find((player) => player.userId === userId))
    .filter((player): player is RoomPlayer => Boolean(player));
}

export default function GameScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { api, session } = useSession();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [lastPrivateEvent, setLastPrivateEvent] = useState('');
  const hasHandledFinishRef = useRef(false);
  const [timerMode, setTimerMode] = useState<'speech' | 'discussion'>('speech');
  const [currentSpeakerIndex, setCurrentSpeakerIndex] = useState(0);
  const [timerDuration, setTimerDuration] = useState<number>(SPEECH_SECONDS);
  const [timeLeft, setTimeLeft] = useState<number>(SPEECH_SECONDS);
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
    setSelectedAction(null);
    setSelectedTarget(null);
  }, [room?.phase]);

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

  const currentPlayer = room?.players.find((player) => player.userId === session.userId);
  const isHost = Boolean(currentPlayer?.host);
  const roomPhase = room?.phase;

  useEffect(() => {
    if (!roomPhase || !isHost) {
      return;
    }

    if (roomPhase === 'DAY_DISCUSSION') {
      setTimerMode('speech');
      setCurrentSpeakerIndex(0);
      setTimerDuration(SPEECH_SECONDS);
      setTimeLeft(SPEECH_SECONDS);
      setTimerRunning(false);
      return;
    }

    setTimerRunning(false);
  }, [isHost, roomPhase]);

  if (!room) {
    return (
      <Screen>
        <ActivityIndicator color={palette.blue} size="large" />
      </Screen>
    );
  }

  const currentRoom = room;
  const moderatorPlayers = currentRoom.players.filter((player) => !player.host);
  const alivePlayers = moderatorPlayers.filter((player) => player.status === 'ALIVE');
  const queuedPlayers = queuePlayers(moderatorPlayers, currentRoom.discussionQueueUserIds);
  const currentSpeaker = moderatorPlayers[currentSpeakerIndex] ?? null;
  const currentUserInQueue =
    session.userId != null && currentRoom.discussionQueueUserIds.includes(session.userId);
  const canSubmitNightAction =
    currentRoom.phase === 'NIGHT_ACTIONS' && currentRoom.currentUserActions.length > 0;
  const canSubmitVote = currentRoom.phase === 'DAY_VOTING';

  function resetSpeechTimer(index: number) {
    setTimerMode('speech');
    setCurrentSpeakerIndex(index);
    setTimerDuration(SPEECH_SECONDS);
    setTimeLeft(SPEECH_SECONDS);
    setTimerRunning(false);
  }

  function startDiscussionTimer() {
    const nextDuration = discussionSeconds(currentRoom.discussionQueueUserIds.length);
    setTimerMode('discussion');
    setTimerDuration(nextDuration);
    setTimeLeft(nextDuration);
    setTimerRunning(false);
  }

  function resetDiscussionFlow() {
    resetSpeechTimer(0);
  }

  async function changePhase(nextPhase: GamePhase) {
    try {
      if (nextPhase === 'DAY_DISCUSSION') {
        setRoom(await api.startDayDiscussion(currentRoom.roomId));
        return;
      }
      if (nextPhase === 'DAY_VOTING') {
        setRoom(await api.startVoting(currentRoom.roomId));
        return;
      }
      if (nextPhase === 'NIGHT_ACTIONS') {
        setRoom(await api.startNight(currentRoom.roomId));
      }
    } catch (error) {
      Alert.alert('Phase change failed', error instanceof Error ? error.message : 'Cannot change phase');
    }
  }

  async function joinDiscussion() {
    try {
      setRoom(await api.joinDiscussionQueue(currentRoom.roomId));
    } catch (error) {
      Alert.alert('Queue failed', error instanceof Error ? error.message : 'Cannot join discussion queue');
    }
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

  function addTime(extraSeconds: number) {
    setTimerDuration((current) => current + extraSeconds);
    setTimeLeft((current) => current + extraSeconds);
  }

  function nextSpeechOrDiscussion() {
    if (currentSpeakerIndex < moderatorPlayers.length - 1) {
      resetSpeechTimer(currentSpeakerIndex + 1);
      return;
    }
    startDiscussionTimer();
  }

  async function sendAction() {
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

  if (currentRoom.phase === 'FINISHED') {
    return (
      <Screen>
        <SectionCard>
          <Text style={styles.title}>{currentRoom.name}</Text>
          <Text style={styles.meta}>Game finished</Text>
          <Text style={styles.meta}>Winner: {currentRoom.winner}</Text>
          <Text style={styles.meta}>Night: {currentRoom.nightNumber}</Text>
          <Text style={styles.meta}>Day: {currentRoom.dayNumber}</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>Players</Text>
          {currentRoom.players.map((player) => (
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
          <Text style={styles.title}>{currentRoom.name}</Text>
          <Text style={styles.meta}>Phase: {currentRoom.phase}</Text>
          <Text style={styles.meta}>Night: {currentRoom.nightNumber}</Text>
          <Text style={styles.meta}>Day: {currentRoom.dayNumber}</Text>
          <Text style={styles.meta}>Mode: Moderator</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>Stages</Text>
          <Button
            label="Day"
            tone={currentRoom.phase === 'DAY_DISCUSSION' ? 'primary' : 'secondary'}
            onPress={() => void changePhase('DAY_DISCUSSION')}
          />
          <Button
            label="Voting"
            tone={currentRoom.phase === 'DAY_VOTING' ? 'primary' : 'secondary'}
            onPress={() => void changePhase('DAY_VOTING')}
          />
          <Button
            label="Night"
            tone={currentRoom.phase === 'NIGHT_ACTIONS' ? 'primary' : 'secondary'}
            onPress={() => void changePhase('NIGHT_ACTIONS')}
          />
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>Moderator timer</Text>
          {currentRoom.phase === 'DAY_DISCUSSION' ? (
            <>
              <Text style={styles.timerLabel}>
                {timerMode === 'speech'
                  ? `Speech: ${currentSpeaker?.email ?? 'No speaker'}`
                  : 'Discussion'}
              </Text>
              <Text style={[styles.timerValue, timeLeft === 0 && styles.timerValueExpired]}>
                {formatTimer(timeLeft)}
              </Text>
              {timerMode === 'speech' ? (
                <>
                  <Button
                    label={currentSpeakerIndex < moderatorPlayers.length - 1 ? 'Next speaker' : 'Start discussion'}
                    onPress={nextSpeechOrDiscussion}
                  />
                  <Button
                    label="+15 sec"
                    tone="secondary"
                    onPress={() => addTime(SPEECH_EXTENSION_SECONDS)}
                  />
                </>
              ) : (
                <>
                  <Button label="+30 sec" tone="secondary" onPress={() => addTime(DISCUSSION_EXTENSION_SECONDS)} />
                  <Button label="Restart speeches" tone="secondary" onPress={resetDiscussionFlow} />
                </>
              )}
              <Button label={timerRunning ? 'Pause' : 'Start'} onPress={toggleTimer} />
              <Button label="Reset timer" tone="secondary" onPress={resetTimer} />
              {timeLeft === 0 ? <Text style={styles.timerExpired}>Time is up.</Text> : null}
            </>
          ) : (
            <Text style={styles.meta}>
              Timer is active during the day discussion stage.
            </Text>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>Discussion queue</Text>
          <Text style={styles.meta}>
            {queuedPlayers.length
              ? `Discussion after speeches: ${discussionSeconds(queuedPlayers.length)} sec`
              : 'No one has taken the discussion queue. Discussion stays at 03:00.'}
          </Text>
          {queuedPlayers.length ? (
            queuedPlayers.map((player) => (
              <PlayerCard
                key={player.userId}
                title={player.email}
                subtitle="Queued for discussion"
                style={styles.queuePlayerCard}
              />
            ))
          ) : (
            <Text style={styles.meta}>Queue is empty.</Text>
          )}
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

        {currentRoom.activeVoteRound ? (
          <SectionCard>
            <Text style={styles.title}>Vote round</Text>
            <VoteRoundCard voteRound={currentRoom.activeVoteRound} />
          </SectionCard>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <SectionCard>
        <Text style={styles.title}>{currentRoom.name}</Text>
        <Text style={styles.meta}>Phase: {currentRoom.phase}</Text>
        <Text style={styles.meta}>Night: {currentRoom.nightNumber}</Text>
        <Text style={styles.meta}>Day: {currentRoom.dayNumber}</Text>
        <Text style={styles.meta}>Your role: {currentRoom.currentUserRole ?? 'Hidden'}</Text>
        {lastPrivateEvent ? <Text style={styles.privateInfo}>{lastPrivateEvent}</Text> : null}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Players</Text>
        {currentRoom.players.map((player) => (
          <PlayerCard
            key={player.userId}
            title={player.email}
            subtitle={`${player.status}${player.visibleRole ? ` | ${player.visibleRole}` : ''}`}
            highlight={player.host}
          />
        ))}
      </SectionCard>

      {currentRoom.phase === 'DAY_DISCUSSION' ? (
        <SectionCard>
          <Text style={styles.title}>Discussion queue</Text>
          <Text style={styles.meta}>
            Take a place in the discussion queue for the group talk after speeches.
          </Text>
          <Button
            label={currentUserInQueue ? 'Already in queue' : 'Join discussion queue'}
            onPress={() => void joinDiscussion()}
            disabled={currentUserInQueue || currentPlayer?.status !== 'ALIVE'}
          />
        </SectionCard>
      ) : null}

      {currentRoom.phase === 'NIGHT_ACTIONS' ? (
        <>
          <SectionCard>
            <Text style={styles.title}>Actions</Text>
            {currentRoom.currentUserActions.length ? (
              currentRoom.currentUserActions.map((action) => (
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
            <Button label="Skip target" tone="secondary" onPress={() => setSelectedTarget(null)} />
          </SectionCard>
        </>
      ) : null}

      {currentRoom.phase === 'DAY_VOTING' ? (
        <SectionCard>
          <Text style={styles.title}>Vote target</Text>
          {alivePlayers.map((player) => (
            <Button
              key={player.userId}
              label={`${selectedTarget === player.userId ? 'Selected: ' : ''}${player.email}`}
              tone={selectedTarget === player.userId ? 'primary' : 'secondary'}
              onPress={() => setSelectedTarget(player.userId)}
            />
          ))}
        </SectionCard>
      ) : null}

      {currentRoom.activeVoteRound ? (
        <SectionCard>
          <Text style={styles.title}>Vote round</Text>
          <VoteRoundCard voteRound={currentRoom.activeVoteRound} />
        </SectionCard>
      ) : null}

      {canSubmitNightAction || canSubmitVote ? (
        <Button
          label={currentRoom.phase === 'DAY_VOTING' ? 'Submit vote' : 'Submit action'}
          onPress={() => void sendAction()}
          disabled={currentRoom.phase === 'NIGHT_ACTIONS' ? !selectedAction : !selectedTarget}
        />
      ) : null}
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
  queuePlayerCard: {
    backgroundColor: palette.softBlue,
    borderColor: palette.blue,
  },
});
