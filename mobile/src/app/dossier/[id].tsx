import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { BreathingView, Reveal } from '@/components/motion';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type PlayerDossier } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function DossierScreen() {
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
    heroName: {
      color: theme.text,
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
    },
    heroMeta: {
      color: theme.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    statStrip: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
    },
    statCard: {
      alignItems: 'center',
      backgroundColor: theme.accentSoft,
      borderRadius: 18,
      minWidth: 92,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    statValue: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
    },
    statLabel: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '800',
    },
    note: {
      color: theme.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    strip: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 14,
    },
    stripLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    stripValue: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
    },
    cardRow: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 4,
      padding: 14,
    },
    rowTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
    },
    rowMeta: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    connectionRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    connectionBody: {
      flex: 1,
      gap: 3,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 4,
      minWidth: '47%',
      padding: 14,
    },
    metricLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    metricValue: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
  }));
  const [dossier, setDossier] = useState<PlayerDossier | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setRefreshing(true);
      }

      const next = id === 'me' ? await api.getMyDossier() : await api.getUserDossier(Number(id));
      setDossier(next);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('dossier.cannotLoad'));
      if (id !== 'me') {
        router.back();
      }
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

  if (!dossier) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const percentageCards = [
    dossier.voting.eliminationHitRate !== null
      ? { label: t('dossier.executionPrecision'), value: formatPercent(dossier.voting.eliminationHitRate) }
      : null,
    dossier.voting.mafiaCatchRate !== null
      ? { label: t('dossier.mafiaCatchRate'), value: formatPercent(dossier.voting.mafiaCatchRate) }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} tintColor={colors.primary} />}>
      <BreathingView>
        <Reveal>
          <SectionCard style={styles.hero}>
            <Text style={styles.eyebrow}>{t('dossier.private')}</Text>
            <AvatarBadge label={dossier.user.nickname} avatarUrl={dossier.user.avatarUrl} size={104} />
            <Text style={styles.heroName}>{dossier.user.nickname}</Text>
            <Text style={styles.heroMeta}>
              {t('dossier.meta')
                .replace('{rating}', String(dossier.career.rating))
                .replace('{hosted}', String(dossier.career.hostedGames))
                .replace('{tables}', dossier.career.hostedGames === 1 ? t('common.table') : t('common.tables'))}
            </Text>
            <View style={styles.statStrip}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{dossier.career.totalGames}</Text>
                <Text style={styles.statLabel}>{t('common.games')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{dossier.career.wins}</Text>
                <Text style={styles.statLabel}>{t('common.wins')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatPercent(dossier.career.winRate)}</Text>
                <Text style={styles.statLabel}>{t('common.winRate')}</Text>
              </View>
            </View>
          </SectionCard>
        </Reveal>
      </BreathingView>

      <Reveal delay={80}>
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('dossier.recentForm')}</Text>
          <View style={styles.strip}>
            <Text style={styles.stripLabel}>{t('dossier.currentStreak')}</Text>
            <Text style={styles.stripValue}>
              {dossier.form.currentStreakResult === 'NONE'
                ? t('dossier.noTrend')
                : `${dossier.form.currentStreakResult}${dossier.form.currentStreakCount}`}
            </Text>
          </View>
        </SectionCard>
      </Reveal>

      {dossier.limited ? (
        <Reveal delay={120}>
          <SectionCard>
            <Text style={styles.sectionTitle}>{t('dossier.clubNote')}</Text>
            <Text style={styles.note}>
              {t('dossier.clubNoteCopy')}
            </Text>
          </SectionCard>
        </Reveal>
      ) : (
        <>
          <Reveal delay={120}>
            <SectionCard>
              <Text style={styles.sectionTitle}>{t('dossier.roleMastery')}</Text>
              {dossier.mastery.map((role) => (
                <View key={role.roleId} style={styles.cardRow}>
                  <Text style={styles.rowTitle}>{role.roleName}</Text>
                  <Text style={styles.rowMeta}>
                    {t('dossier.appearances')
                      .replace('{count}', String(role.playCount))
                      .replace('{rate}', formatPercent(role.winRate))}
                  </Text>
                </View>
              ))}
            </SectionCard>
          </Reveal>

          <Reveal delay={160}>
            <SectionCard>
              <Text style={styles.sectionTitle}>{t('dossier.voting')}</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('dossier.ballotsCast')}</Text>
                  <Text style={styles.metricValue}>{dossier.voting.totalDayVotesCast}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('dossier.votesReceived')}</Text>
                  <Text style={styles.metricValue}>{dossier.voting.totalVotesReceived}</Text>
                </View>
                {percentageCards.map((metric) => (
                  <View key={metric.label} style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          </Reveal>

          <Reveal delay={200}>
            <SectionCard>
              <Text style={styles.sectionTitle}>{t('dossier.tableStyle')}</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('dossier.averageTable')}</Text>
                  <Text style={styles.metricValue}>{dossier.tableStats.averagePlayersPerGame.toFixed(1)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('dossier.averageDays')}</Text>
                  <Text style={styles.metricValue}>{dossier.tableStats.averageDayCount.toFixed(1)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('dossier.averageNights')}</Text>
                  <Text style={styles.metricValue}>{dossier.tableStats.averageNightCount.toFixed(1)}</Text>
                </View>
              </View>
            </SectionCard>
          </Reveal>

          <Reveal delay={240}>
            <SectionCard>
              <Text style={styles.sectionTitle}>{t('dossier.regularCompany')}</Text>
              {dossier.connections.length ? (
                dossier.connections.map((connection) => (
                  <View key={connection.userId} style={styles.connectionRow}>
                    <AvatarBadge label={connection.nickname} avatarUrl={connection.avatarUrl} size={52} />
                    <View style={styles.connectionBody}>
                      <Text style={styles.rowTitle}>{connection.nickname}</Text>
                      <Text style={styles.rowMeta}>{t('dossier.sharedGames').replace('{count}', String(connection.sharedGames))}</Text>
                    </View>
                    <Button label={t('common.open')} onPress={() => router.push(`/users/${connection.userId}` as never)} />
                  </View>
                ))
              ) : (
                <Text style={styles.note}>{t('dossier.noCompany')}</Text>
              )}
            </SectionCard>
          </Reveal>
        </>
      )}

      <Reveal delay={280}>
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('dossier.recentTables')}</Text>
          {dossier.recentGames.length ? (
            dossier.recentGames.map((game) => (
              <View key={game.gameId} style={styles.cardRow}>
                <Text style={styles.rowTitle}>{game.roomName}</Text>
                <Text style={styles.rowMeta}>
                  {game.roleName} / {game.won ? t('common.won') : t('common.lost')} / {new Date(game.finishedAt).toLocaleDateString()}
                  {game.host ? ` / ${t('common.host')}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.note}>{t('history.emptyTitle')}</Text>
          )}
        </SectionCard>
      </Reveal>
    </Screen>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
