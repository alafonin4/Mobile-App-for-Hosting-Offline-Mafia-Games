import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';

import { BreathingView, Reveal } from '@/components/motion';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type RatingResponse } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function RatingScreen() {
  const { api } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
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
      fontSize: 28,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    banner: {
      backgroundColor: theme.accentSoft,
      borderRadius: 18,
      gap: 4,
      padding: 14,
    },
    bannerLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    bannerText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 21,
    },
    loader: {
      alignItems: 'center',
      paddingVertical: 32,
    },
  }));
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<'all' | 'friends'>('all');
  const [data, setData] = useState<RatingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setData(await api.getRating(scope));
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          setLoading(true);
          const next = await api.getRating(scope);
          if (!cancelled) {
            setData(next);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void load();
      return () => {
        cancelled = true;
      };
    }, [scope, api])
  );

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <BreathingView>
        <Reveal>
          <SectionCard style={styles.hero}>
            <Text style={styles.eyebrow}>{t('rating.eyebrow')}</Text>
            <Text style={styles.title}>{t('rating.title')}</Text>
            <Text style={styles.subtitle}>
              {t('rating.copy')}
            </Text>
            <SegmentedControl
              options={[
                { label: t('rating.allMembers'), value: 'all' },
                { label: t('rating.myCircle'), value: 'friends' },
              ]}
              value={scope}
              onChange={setScope}
            />
            {data?.currentUser ? (
              <View style={styles.banner}>
                <Text style={styles.bannerLabel}>{t('rating.yourStanding')}</Text>
                <Text style={styles.bannerText}>
                  {data.currentUser.nickname} / {t('common.rank')} {data.currentUserRank ?? '-'} / {t('common.rating').toLowerCase()} {data.currentUser.rating}
                </Text>
              </View>
            ) : null}
          </SectionCard>
        </Reveal>
      </BreathingView>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        data?.entries.map((entry, index) => (
          <Reveal key={entry.id} delay={Math.min(index * 30, 210)}>
            <PlayerCard
              title={`${entry.rank}. ${entry.nickname}`}
              subtitle={t('rating.entryMeta')
                .replace('{rating}', String(entry.rating))
                .replace('{games}', String(entry.gamesPlayed))
                .replace('{wins}', String(entry.wins))}
              highlight={entry.currentUser}
            />
          </Reveal>
        ))
      )}
    </Screen>
  );
}
