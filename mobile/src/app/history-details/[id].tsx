import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { BreathingView, Reveal } from '@/components/motion';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { VoteRoundCard } from '@/components/vote-round-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type HistoryDetail } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function HistoryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
    loader: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
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
    heroCard: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.accent,
      borderWidth: 1,
    },
    headlineGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    headlinePill: {
      backgroundColor: theme.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    headlineLabel: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    headlineValue: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
    },
    awardCard: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      padding: 14,
    },
    awardBody: {
      flex: 1,
      gap: 4,
    },
    awardTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
    },
    awardRecipient: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '600',
    },
    awardMetric: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    survivorRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    survivorBody: {
      flex: 1,
      gap: 4,
    },
    survivorName: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
    },
    survivorRole: {
      color: theme.textMuted,
      fontSize: 13,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    summaryCard: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 4,
      minWidth: '47%',
      padding: 14,
    },
    summaryLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    summaryValue: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
  }));
  const [details, setDetails] = useState<HistoryDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setRefreshing(true);
      }
      setDetails(await api.getHistoryDetails(Number(id)));
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('historyDetails.cannotLoad'));
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, [api, id, t]);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load])
  );

  if (!details) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} tintColor={colors.primary} />}>
      <BreathingView>
        <Reveal>
          <SectionCard>
            <Text style={styles.eyebrow}>{t('historyDetails.signatureRecap')}</Text>
            <Text style={styles.title}>{details.recap.headline.roomName}</Text>
            <Text style={styles.meta}>
              {t('common.winner')}: {details.recap.headline.winner} / {new Date(details.recap.headline.finishedAt).toLocaleString()}
            </Text>
          </SectionCard>
        </Reveal>
      </BreathingView>

      <Reveal delay={60}>
        <SectionCard>
          <View style={styles.headlineGrid}>
            <View style={styles.headlinePill}>
              <Text style={styles.headlineLabel}>{t('common.guests')}</Text>
              <Text style={styles.headlineValue}>{details.recap.headline.participantCount}</Text>
            </View>
            <View style={styles.headlinePill}>
              <Text style={styles.headlineLabel}>{t('common.days')}</Text>
              <Text style={styles.headlineValue}>{details.recap.headline.dayNumber}</Text>
            </View>
            <View style={styles.headlinePill}>
              <Text style={styles.headlineLabel}>{t('common.nights')}</Text>
              <Text style={styles.headlineValue}>{details.recap.headline.nightNumber}</Text>
            </View>
          </View>
        </SectionCard>
      </Reveal>

      <Reveal delay={110}>
        <SectionCard>
          <Text style={styles.title}>{t('historyDetails.awards')}</Text>
          {details.recap.awards.map((award) => (
            <View key={award.key} style={styles.awardCard}>
              <AvatarBadge label={award.recipientLabel} avatarUrl={award.recipientAvatarUrl} size={52} />
              <View style={styles.awardBody}>
                <Text style={styles.awardTitle}>{award.title}</Text>
                <Text style={styles.awardRecipient}>{award.recipientLabel}</Text>
                <Text style={styles.awardMetric}>
                  {award.metricLabel}: {award.metricValue}
                </Text>
              </View>
            </View>
          ))}
        </SectionCard>
      </Reveal>

      <Reveal delay={150}>
        <SectionCard>
          <Text style={styles.title}>{t('historyDetails.survivors')}</Text>
          {details.recap.survivors.length ? (
            details.recap.survivors.map((player) => (
              <View key={player.userId} style={styles.survivorRow}>
                <AvatarBadge label={player.nickname} avatarUrl={player.avatarUrl} size={52} />
                <View style={styles.survivorBody}>
                  <Text style={styles.survivorName}>{player.nickname}</Text>
                  <Text style={styles.survivorRole}>
                    {player.roleName}
                    {player.host ? ` / ${t('common.host')}` : ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>{t('historyDetails.noSurvivors')}</Text>
          )}
        </SectionCard>
      </Reveal>

      <Reveal delay={190}>
        <SectionCard>
          <Text style={styles.title}>{t('historyDetails.tableSummary')}</Text>
          <View style={styles.summaryGrid}>
            {details.recap.tableSummary.map((metric) => (
              <View key={metric.label} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{metric.label}</Text>
                <Text style={styles.summaryValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      </Reveal>

      <Reveal delay={230}>
        <SectionCard style={styles.heroCard}>
          <Text style={styles.title}>{details.name}</Text>
          <Text style={styles.meta}>{t('common.winner')}: {details.winner}</Text>
          <Text style={styles.meta}>{t('common.nights')}: {details.nightNumber}</Text>
          <Text style={styles.meta}>{t('common.days')}: {details.dayNumber}</Text>
        </SectionCard>
      </Reveal>

      <Reveal delay={270}>
        <SectionCard>
          <Text style={styles.title}>{t('common.players')}</Text>
          {details.players.map((player) => (
            <PlayerCard
              key={player.userId}
              title={player.email}
              subtitle={`${player.role} | ${player.status}`}
              highlight={player.host}
            />
          ))}
        </SectionCard>
      </Reveal>

      <Reveal delay={310}>
        <SectionCard>
          <Text style={styles.title}>{t('historyDetails.votes')}</Text>
          {details.voteHistory.length ? (
            details.voteHistory.map((voteRound) => <VoteRoundCard key={voteRound.id} voteRound={voteRound} />)
          ) : (
            <Text style={styles.meta}>{t('historyDetails.noVotes')}</Text>
          )}
        </SectionCard>
      </Reveal>
    </Screen>
  );
}
