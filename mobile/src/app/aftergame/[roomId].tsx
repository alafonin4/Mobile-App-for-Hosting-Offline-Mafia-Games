import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { BreathingView, Reveal } from '@/components/motion';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type HistoryDetail } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function AftergameCeremonyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
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
    title: {
      color: theme.text,
      fontSize: 30,
      fontWeight: '800',
    },
    meta: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '800',
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
      fontWeight: '800',
    },
    awardMeta: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    summaryCard: {
      backgroundColor: theme.accentSoft,
      borderRadius: 16,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) {
      return;
    }

    try {
      const next = await api.getHistoryDetailsByRoomId(roomId);
      setDetails(next);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('ceremony.cannotPrepare'));
    } finally {
      setLoading(false);
    }
  }, [api, roomId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || !details) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.meta}>{t('ceremony.loading')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}>
      <BreathingView>
        <Reveal>
          <SectionCard style={styles.hero}>
            <Text style={styles.eyebrow}>{t('ceremony.eyebrow')}</Text>
            <Text style={styles.title}>{t('ceremony.title')}</Text>
            <Text style={styles.meta}>{details.name}</Text>
            <Text style={styles.meta}>
              {t('ceremony.winner')}: {details.winner} / {new Date(details.finishedAt).toLocaleString()}
            </Text>
            <Button label={t('ceremony.openArchive')} onPress={() => router.replace(`/history-details/${details.id}` as never)} />
            <Button label={t('ceremony.backToGames')} tone="secondary" onPress={() => router.replace('/games')} />
          </SectionCard>
        </Reveal>
      </BreathingView>

      <Reveal delay={80}>
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('ceremony.awards')}</Text>
          {details.recap.awards.length ? (
            details.recap.awards.map((award) => (
              <View key={award.key} style={styles.awardCard}>
                <AvatarBadge label={award.recipientLabel} avatarUrl={award.recipientAvatarUrl} size={52} />
                <View style={styles.awardBody}>
                  <Text style={styles.awardTitle}>{award.title}</Text>
                  <Text style={styles.awardMeta}>{award.recipientLabel}</Text>
                  <Text style={styles.awardMeta}>
                    {award.metricLabel}: {award.metricValue}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>{t('ceremony.noAwards')}</Text>
          )}
        </SectionCard>
      </Reveal>

      <Reveal delay={130}>
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('ceremony.survivors')}</Text>
          {details.recap.survivors.length ? (
            details.recap.survivors.map((player) => (
              <PlayerCard
                key={player.userId}
                title={player.nickname}
                subtitle={`${player.roleName}${player.host ? ` / ${t('common.host')}` : ''}`}
                highlight={player.host}
              />
            ))
          ) : (
            <Text style={styles.meta}>{t('common.noSurvivors')}</Text>
          )}
        </SectionCard>
      </Reveal>

      <Reveal delay={180}>
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('ceremony.tableSummary')}</Text>
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
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('ceremony.players')}</Text>
          {details.players.map((player) => (
            <PlayerCard
              key={player.userId}
              title={player.email}
              subtitle={`${player.role} / ${player.status}`}
              highlight={player.host}
            />
          ))}
        </SectionCard>
      </Reveal>
    </Screen>
  );
}
