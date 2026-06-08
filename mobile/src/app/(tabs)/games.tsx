import { type Href, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { BreathingView, Reveal } from '@/components/motion';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useThemedStyles } from '@/theme';
import type { GameRoom } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function GamesScreen() {
  const { api } = useSession();
  const { t } = useLocalization();
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const styles = useThemedStyles((colors) => ({
    hero: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.accent,
      borderWidth: 1,
    },
    eyebrow: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '800',
    },
    body: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    split: {
      gap: 14,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '800',
    },
    cardCopy: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    meta: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
  }));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadActiveRoom() {
        try {
          const room = await api.getCurrentRoom();
          if (!cancelled) {
            setActiveRoom(room);
          }
        } catch {
          if (!cancelled) {
            setActiveRoom(null);
          }
        }
      }

      void loadActiveRoom();

      return () => {
        cancelled = true;
      };
    }, [api])
  );

  function openActiveRoom() {
    if (!activeRoom) {
      return;
    }

    if (activeRoom.phase === 'LOBBY') {
      router.push(`/lobby/${activeRoom.roomId}` as never);
      return;
    }

    router.push(`/game/${activeRoom.roomId}` as never);
  }

  return (
    <Screen scroll>
      <BreathingView>
        <Reveal>
          <SectionCard style={styles.hero}>
            <Text style={styles.eyebrow}>{t('games.eyebrow')}</Text>
            <Text style={styles.title}>{t('games.title')}</Text>
            <Text style={styles.body}>
              {t('games.copy')}
            </Text>
          </SectionCard>
        </Reveal>
      </BreathingView>

      <View style={styles.split}>
        {activeRoom ? (
          <Reveal delay={60}>
            <SectionCard>
              <Text style={styles.meta}>{activeRoom.phase === 'LOBBY' ? t('games.activeLobby') : t('games.activeGame')}</Text>
              <Text style={styles.cardTitle}>{activeRoom.name}</Text>
              <Text style={styles.cardCopy}>{t('games.activeCopy')}</Text>
              <Button label={t('games.returnToTable')} onPress={openActiveRoom} />
            </SectionCard>
          </Reveal>
        ) : null}

        <Reveal delay={90}>
          <SectionCard>
            <Text style={styles.cardTitle}>{t('games.hostTitle')}</Text>
            <Text style={styles.cardCopy}>
              {t('games.hostCopy')}
            </Text>
            <Button label={t('games.createTable')} onPress={() => router.push('/create-game')} />
          </SectionCard>
        </Reveal>

        <Reveal delay={150}>
          <SectionCard>
            <Text style={styles.cardTitle}>{t('games.inviteTitle')}</Text>
            <Text style={styles.cardCopy}>
              {t('games.inviteCopy')}
            </Text>
            <Button label={t('games.joinRoom')} tone="secondary" onPress={() => router.push('/join-room')} />
          </SectionCard>
        </Reveal>

        <Reveal delay={210}>
          <SectionCard>
            <Text style={styles.cardTitle}>{t('games.clubsTitle')}</Text>
            <Text style={styles.cardCopy}>
              {t('games.clubsCopy')}
            </Text>
            <Button label={t('games.openClubs')} tone="secondary" onPress={() => router.push('/(tabs)/clubs' as Href)} />
          </SectionCard>
        </Reveal>

        <Reveal delay={270}>
          <SectionCard>
            <Text style={styles.cardTitle}>{t('games.castTitle')}</Text>
            <Text style={styles.cardCopy}>
              {t('games.castCopy')}
            </Text>
            <Button label={t('games.openRoleGallery')} tone="secondary" onPress={() => router.push('/(tabs)/roles' as Href)} />
          </SectionCard>
        </Reveal>
      </View>
    </Screen>
  );
}
