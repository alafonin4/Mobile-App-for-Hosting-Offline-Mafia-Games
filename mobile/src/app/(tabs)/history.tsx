import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { BreathingView, Reveal } from '@/components/motion';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type HistoryListItem } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function HistoryScreen() {
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
    loader: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    rowTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
    },
    rowSubtitle: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    stamp: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  }));
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const next = await api.getHistory();
    setItems(next);
  }, [api]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function run() {
        try {
          setLoading(true);
          const next = await api.getHistory();
          if (!cancelled) {
            setItems(next);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void run();

      return () => {
        cancelled = true;
      };
    }, [api])
  );

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <BreathingView>
        <Reveal>
          <SectionCard style={styles.hero}>
            <Text style={styles.eyebrow}>{t('history.eyebrow')}</Text>
            <Text style={styles.title}>{t('history.title')}</Text>
            <Text style={styles.subtitle}>
              {t('history.copy')}
            </Text>
          </SectionCard>
        </Reveal>
      </BreathingView>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length ? (
        items.map((item, index) => (
          <Reveal key={item.id} delay={Math.min(index * 35, 210)}>
            <Pressable onPress={() => router.push(`/history-details/${item.id}` as never)}>
              <SectionCard>
                <Text style={styles.stamp}>{new Date(item.finishedAt).toLocaleDateString()}</Text>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>
                  {t('history.rowMeta')
                    .replace('{winner}', item.winner)
                    .replace('{guests}', String(item.participantCount))
                    .replace('{days}', String(item.dayNumber))
                    .replace('{nights}', String(item.nightNumber))}
                </Text>
              </SectionCard>
            </Pressable>
          </Reveal>
        ))
      ) : (
        <SectionCard>
          <Text style={styles.rowTitle}>{t('history.emptyTitle')}</Text>
          <Text style={styles.rowSubtitle}>{t('history.emptyCopy')}</Text>
        </SectionCard>
      )}
    </Screen>
  );
}
