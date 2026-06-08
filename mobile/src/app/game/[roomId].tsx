import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PlayerCard } from '@/components/player-card';
import { RoleShowcaseCard } from '@/components/role-showcase-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { VoteRoundCard } from '@/components/vote-round-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { findRoleCatalogItem, mergeRoleCatalog } from '@/utils/role-gallery';
import { type GamePhase, type GameRoom, type RoleCatalogItem, type RoomPlayer } from '@/utils/api';
import { useGameEvents } from '@/utils/game-socket';
import { type TranslationKey, useLocalization } from '@/utils/localization';
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

function formatRoleLabel(role: string | null, variant: string | null, t: (key: TranslationKey) => string) {
  if (!role) {
    return t('game.roleHidden');
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

type HostAssistantItem = {
  key: string;
  labelKey: TranslationKey;
  detailKey: TranslationKey;
  active: boolean;
  done: boolean;
  meta?: string;
};

function buildHostAssistantItems(
  room: GameRoom,
  moderatorPlayers: RoomPlayer[],
  t: (key: TranslationKey) => string,
): HostAssistantItem[] {
  const readyGuests = moderatorPlayers.filter((player) => player.ready).length;
  const aliveGuests = moderatorPlayers.filter((player) => player.status === 'ALIVE').length;
  const requiredNightActions = room.requiredNightActions;
  const pendingNightActions = room.pendingNightActions;
  const submittedNightActions = Math.max(0, requiredNightActions - pendingNightActions);

  return [
    {
      key: 'readiness',
      labelKey: 'hostAssistant.readiness',
      detailKey: 'hostAssistant.readinessDetail',
      active: room.phase === 'LOBBY',
      done: moderatorPlayers.length > 0 && readyGuests === moderatorPlayers.length,
      meta: `${readyGuests}/${moderatorPlayers.length} ${t('game.ready')}`,
    },
    {
      key: 'phase',
      labelKey: 'hostAssistant.phaseControl',
      detailKey: 'hostAssistant.phaseControlDetail',
      active: room.phase !== 'FINISHED',
      done: room.phase !== 'LOBBY',
      meta: room.phase,
    },
    {
      key: 'discussion',
      labelKey: 'hostAssistant.discussion',
      detailKey: 'hostAssistant.discussionDetail',
      active: room.phase === 'DAY_DISCUSSION',
      done: room.dayNumber > 0 && room.phase !== 'DAY_DISCUSSION',
      meta: `${aliveGuests} ${t('game.alive')} / ${room.discussionQueueUserIds.length} ${t('game.queued')}`,
    },
    {
      key: 'voting',
      labelKey: 'hostAssistant.voting',
      detailKey: 'hostAssistant.votingDetail',
      active: room.phase === 'DAY_VOTING',
      done: room.phase === 'NIGHT_ACTIONS' || room.phase === 'FINISHED',
      meta: room.activeVoteRound ? `${t('game.round')} ${room.activeVoteRound.roundNumber}` : t('game.noActiveVote'),
    },
    {
      key: 'night',
      labelKey: 'hostAssistant.nightActions',
      detailKey: 'hostAssistant.nightActionsDetail',
      active: room.phase === 'NIGHT_ACTIONS',
      done: requiredNightActions > 0 && pendingNightActions === 0,
      meta: `${submittedNightActions}/${requiredNightActions} ${t('game.submitted')}`,
    },
    {
      key: 'complete',
      labelKey: 'hostAssistant.complete',
      detailKey: 'hostAssistant.completeDetail',
      active: room.phase === 'FINISHED',
      done: room.phase === 'FINISHED',
      meta: room.winner ? `${t('game.winnerMeta')}: ${room.winner}` : undefined,
    },
  ];
}

export default function GameScreen() {
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
    title: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '800',
    },
    eyebrow: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    meta: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    assistantGrid: {
      gap: 10,
    },
    assistantItem: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 4,
      padding: 14,
    },
    assistantItemActive: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    assistantItemDone: {
      backgroundColor: theme.successSoft,
      borderColor: theme.success,
    },
    assistantLabel: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '800',
    },
    assistantDetail: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    privateInfo: {
      color: theme.primary,
      lineHeight: 20,
    },
    timerLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    timerValue: {
      color: theme.text,
      fontSize: 42,
      fontWeight: '700',
      textAlign: 'center',
    },
    timerValueExpired: {
      color: theme.danger,
    },
    timerExpired: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    mafiaPlayerCard: {
      backgroundColor: theme.dangerSoft,
      borderColor: theme.danger,
    },
    townPlayerCard: {
      backgroundColor: theme.successSoft,
      borderColor: theme.success,
    },
    queuePlayerCard: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    overlayBackdrop: {
      backgroundColor: theme.overlay,
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      padding: 18,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    overlayCard: {
      maxHeight: '82%',
    },
    overlayActions: {
      gap: 10,
      marginTop: 16,
    },
  }));
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogItem[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [lastPrivateEvent, setLastPrivateEvent] = useState('');
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const hasHandledFinishRef = useRef(false);
  const revealedRoleKeyRef = useRef<string | null>(null);
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
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('game.cannotLoadRoom'));
    }
  }, [api, roomId, t]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    async function loadRoleCatalog() {
      try {
        const [mafiaRoles, townRoles] = await Promise.all([api.getMafiaRoles(), api.getTownRoles()]);
        setRoleCatalog(mergeRoleCatalog(mafiaRoles, townRoles));
      } catch (error) {
        Alert.alert(t('game.rolesUnavailable'), error instanceof Error ? error.message : t('game.cannotLoadRoleGallery'));
      }
    }

    void loadRoleCatalog();
  }, [api, t]);

  useEffect(() => {
    hasHandledFinishRef.current = false;
    revealedRoleKeyRef.current = null;
    setShowRoleReveal(false);
  }, [roomId]);

  useGameEvents(roomId ?? '', (event) => {
    if (event.type === 'ROOM_STATE_UPDATED' || event.type === 'GAME_FINISHED') {
      setRoom((current) => mergeRoomState(current, event.payload as GameRoom));
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
    router.replace(`/aftergame/${room.roomId}` as never);
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
  const currentRoleCard = room
    ? findRoleCatalogItem(roleCatalog, room.currentUserRole, room.currentUserVariant)
    : null;
  const currentRoleKey = room?.currentUserRole
    ? `${room.currentUserRole}:${room.currentUserVariant ?? 'DEFAULT'}`
    : null;

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

  useEffect(() => {
    if (!room || isHost || room.phase === 'LOBBY' || !currentRoleCard || !currentRoleKey) {
      return;
    }

    if (revealedRoleKeyRef.current === currentRoleKey) {
      return;
    }

    revealedRoleKeyRef.current = currentRoleKey;
    setShowRoleReveal(true);
  }, [currentRoleCard, currentRoleKey, isHost, room]);

  if (!room) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
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
      Alert.alert(t('game.phaseChangeFailed'), error instanceof Error ? error.message : t('game.cannotChangePhase'));
    }
  }

  async function joinDiscussion() {
    try {
      setRoom(await api.joinDiscussionQueue(currentRoom.roomId));
    } catch (error) {
      Alert.alert(t('game.queueFailed'), error instanceof Error ? error.message : t('game.cannotJoinQueue'));
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
      Alert.alert(t('game.actionFailed'), error instanceof Error ? error.message : t('game.cannotSubmitAction'));
    }
  }

  if (currentRoom.phase === 'FINISHED') {
    return (
      <Screen>
        <SectionCard style={styles.hero}>
          <Text style={styles.eyebrow}>{t('ceremony.eyebrow')}</Text>
          <Text style={styles.title}>{currentRoom.name}</Text>
          <Text style={styles.meta}>{t('game.finishedTitle')}</Text>
          <Text style={styles.meta}>{t('ceremony.winner')}: {currentRoom.winner}</Text>
          <Text style={styles.meta}>{t('game.night')}: {currentRoom.nightNumber}</Text>
          <Text style={styles.meta}>{t('game.day')}: {currentRoom.dayNumber}</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>{t('game.players')}</Text>
          {currentRoom.players.map((player) => (
            <PlayerCard
              key={player.userId}
              title={player.email}
              subtitle={`${player.status}${player.visibleRole ? ` | ${player.visibleRole}` : ''}`}
              highlight={player.host}
            />
          ))}
        </SectionCard>

        <Button label={t('game.finishedHistory')} onPress={() => router.replace(`/aftergame/${currentRoom.roomId}` as never)} />
        <Button label={t('game.finishedGames')} tone="secondary" onPress={() => router.replace('/games')} />
      </Screen>
    );
  }

  if (isHost) {
    return (
      <Screen scroll>
        <SectionCard style={styles.hero}>
          <Text style={styles.eyebrow}>{t('game.moderatorConsole')}</Text>
          <Text style={styles.title}>{currentRoom.name}</Text>
          <Text style={styles.meta}>{t('game.phase')}: {currentRoom.phase}</Text>
          <Text style={styles.meta}>{t('game.night')}: {currentRoom.nightNumber}</Text>
          <Text style={styles.meta}>{t('game.day')}: {currentRoom.dayNumber}</Text>
          <Text style={styles.meta}>{t('game.modeModerator')}</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>{t('hostAssistant.title')}</Text>
          <Text style={styles.meta}>{t('hostAssistant.subtitle')}</Text>
          <View style={styles.assistantGrid}>
            {buildHostAssistantItems(currentRoom, moderatorPlayers, t).map((item) => (
              <View
                key={item.key}
                style={[
                  styles.assistantItem,
                  item.active && styles.assistantItemActive,
                  item.done && styles.assistantItemDone,
                ]}
              >
                <Text style={styles.assistantLabel}>{t(item.labelKey)}</Text>
                <Text style={styles.assistantDetail}>{t(item.detailKey)}</Text>
                {item.meta ? <Text style={styles.assistantDetail}>{item.meta}</Text> : null}
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>{t('game.stages')}</Text>
          <Button
            label={t('game.dayStage')}
            tone={currentRoom.phase === 'DAY_DISCUSSION' ? 'primary' : 'secondary'}
            onPress={() => void changePhase('DAY_DISCUSSION')}
          />
          <Button
            label={t('game.votingStage')}
            tone={currentRoom.phase === 'DAY_VOTING' ? 'primary' : 'secondary'}
            onPress={() => void changePhase('DAY_VOTING')}
          />
          <Button
            label={t('game.nightStage')}
            tone={currentRoom.phase === 'NIGHT_ACTIONS' ? 'primary' : 'secondary'}
            onPress={() => void changePhase('NIGHT_ACTIONS')}
          />
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>{t('game.moderatorTimer')}</Text>
          {currentRoom.phase === 'DAY_DISCUSSION' ? (
            <>
              <Text style={styles.timerLabel}>
                {timerMode === 'speech'
                  ? `${t('game.speech')}: ${currentSpeaker?.email ?? t('game.noSpeaker')}`
                  : t('game.discussion')}
              </Text>
              <Text style={[styles.timerValue, timeLeft === 0 && styles.timerValueExpired]}>
                {formatTimer(timeLeft)}
              </Text>
              {timerMode === 'speech' ? (
                <>
                  <Button
                    label={currentSpeakerIndex < moderatorPlayers.length - 1 ? t('game.nextSpeaker') : t('game.startDiscussion')}
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
                  <Button label={t('game.restartSpeeches')} tone="secondary" onPress={resetDiscussionFlow} />
                </>
              )}
              <Button label={timerRunning ? t('game.pause') : t('game.start')} onPress={toggleTimer} />
              <Button label={t('game.resetTimer')} tone="secondary" onPress={resetTimer} />
              {timeLeft === 0 ? <Text style={styles.timerExpired}>{t('game.timeIsUp')}</Text> : null}
            </>
          ) : (
            <Text style={styles.meta}>
              {t('game.timerInactive')}
            </Text>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>{t('game.discussionQueue')}</Text>
          <Text style={styles.meta}>
            {queuedPlayers.length
              ? `${t('game.queueAfterSpeeches')}: ${discussionSeconds(queuedPlayers.length)} sec`
              : t('game.queueEmptyLong')}
          </Text>
          {queuedPlayers.length ? (
            queuedPlayers.map((player) => (
              <PlayerCard
                key={player.userId}
                title={player.email}
                subtitle={t('game.queuedForDiscussion')}
                style={styles.queuePlayerCard}
              />
            ))
          ) : (
            <Text style={styles.meta}>{t('game.queueEmpty')}</Text>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>{t('game.playersAndRoles')}</Text>
          <Text style={styles.meta}>{t('game.roleColorHint')}</Text>
          {moderatorPlayers.map((player) => (
            <PlayerCard
              key={player.userId}
              title={player.email}
              subtitle={`${player.status} | ${formatRoleLabel(player.visibleRole, player.visibleVariant, t)}`}
              style={player.visibleFaction === 'MAFIA' ? styles.mafiaPlayerCard : styles.townPlayerCard}
            />
          ))}
        </SectionCard>

        {currentRoom.activeVoteRound ? (
          <SectionCard>
            <Text style={styles.title}>{t('game.voteRound')}</Text>
            <VoteRoundCard voteRound={currentRoom.activeVoteRound} />
          </SectionCard>
        ) : null}
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <SectionCard style={styles.hero}>
          <Text style={styles.eyebrow}>{t('game.activeTable')}</Text>
          <Text style={styles.title}>{currentRoom.name}</Text>
          <Text style={styles.meta}>{t('game.phase')}: {currentRoom.phase}</Text>
          <Text style={styles.meta}>{t('game.night')}: {currentRoom.nightNumber}</Text>
          <Text style={styles.meta}>{t('game.day')}: {currentRoom.dayNumber}</Text>
          <Text style={styles.meta}>
            {t('game.yourRole')}: {currentRoleCard?.name ?? currentRoom.currentUserRole ?? t('common.hidden')}
          </Text>
          {currentRoleCard ? (
            <Button label={t('game.reviewRoleCard')} tone="secondary" onPress={() => setShowRoleReveal(true)} />
          ) : null}
          {lastPrivateEvent ? <Text style={styles.privateInfo}>{lastPrivateEvent}</Text> : null}
        </SectionCard>

        <SectionCard>
          <Text style={styles.title}>{t('game.players')}</Text>
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
            <Text style={styles.title}>{t('game.discussionQueue')}</Text>
            <Text style={styles.meta}>{t('game.discussionQueueCopy')}</Text>
            <Button
              label={currentUserInQueue ? t('game.alreadyInQueue') : t('game.joinDiscussionQueue')}
              onPress={() => void joinDiscussion()}
              disabled={currentUserInQueue || currentPlayer?.status !== 'ALIVE'}
            />
          </SectionCard>
        ) : null}

        {currentRoom.phase === 'NIGHT_ACTIONS' ? (
          <>
            <SectionCard>
              <Text style={styles.title}>{t('game.actions')}</Text>
              {currentRoom.currentUserActions.length ? (
                currentRoom.currentUserActions.map((action) => (
                  <Button
                    key={action.slotId}
                    label={`${selectedAction === action.actionCode ? `${t('common.selectedPrefix')}: ` : ''}${action.actionCode}`}
                    tone={selectedAction === action.actionCode ? 'primary' : 'secondary'}
                    onPress={() => setSelectedAction(action.actionCode)}
                  />
                ))
              ) : (
                <Text style={styles.meta}>{t('game.noActions')}</Text>
              )}
            </SectionCard>

            <SectionCard>
              <Text style={styles.title}>{t('game.target')}</Text>
              {alivePlayers.map((player) => (
                <Button
                  key={player.userId}
                  label={`${selectedTarget === player.userId ? `${t('common.selectedPrefix')}: ` : ''}${player.email}`}
                  tone={selectedTarget === player.userId ? 'primary' : 'secondary'}
                  onPress={() => setSelectedTarget(player.userId)}
                />
              ))}
              <Button label={t('game.skipTarget')} tone="secondary" onPress={() => setSelectedTarget(null)} />
            </SectionCard>
          </>
        ) : null}

        {currentRoom.phase === 'DAY_VOTING' ? (
          <SectionCard>
            <Text style={styles.title}>{t('game.voteTarget')}</Text>
            {alivePlayers.map((player) => (
              <Button
                key={player.userId}
                label={`${selectedTarget === player.userId ? `${t('common.selectedPrefix')}: ` : ''}${player.email}`}
                tone={selectedTarget === player.userId ? 'primary' : 'secondary'}
                onPress={() => setSelectedTarget(player.userId)}
              />
            ))}
          </SectionCard>
        ) : null}

        {currentRoom.activeVoteRound ? (
          <SectionCard>
            <Text style={styles.title}>{t('game.voteRound')}</Text>
            <VoteRoundCard voteRound={currentRoom.activeVoteRound} />
          </SectionCard>
        ) : null}

        {canSubmitNightAction || canSubmitVote ? (
          <Button
            label={currentRoom.phase === 'DAY_VOTING' ? t('game.submitVote') : t('game.submitAction')}
            onPress={() => void sendAction()}
            disabled={currentRoom.phase === 'NIGHT_ACTIONS' ? !selectedAction : !selectedTarget}
          />
        ) : null}
      </Screen>

      {showRoleReveal && currentRoleCard ? (
        <View style={styles.overlayBackdrop}>
          <RoleShowcaseCard item={currentRoleCard} style={styles.overlayCard} />
          <View style={styles.overlayActions}>
            <Button label={t('game.enterTable')} onPress={() => setShowRoleReveal(false)} />
            <Button
              label={t('game.openFullGallery')}
              tone="secondary"
              onPress={() => {
                setShowRoleReveal(false);
                router.push('/(tabs)/roles' as Href);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function mergeRoomState(current: GameRoom | null, incoming: GameRoom) {
  if (!current || incoming.currentUserRole) {
    return incoming;
  }

  return {
    ...incoming,
    currentUserRole: current.currentUserRole,
    currentUserVariant: current.currentUserVariant,
    currentUserFaction: current.currentUserFaction,
    currentUserActions: current.currentUserActions,
    currentUserMuted: incoming.currentUserMuted || current.currentUserMuted,
    currentUserVoteImmune: incoming.currentUserVoteImmune || current.currentUserVoteImmune,
  };
}
