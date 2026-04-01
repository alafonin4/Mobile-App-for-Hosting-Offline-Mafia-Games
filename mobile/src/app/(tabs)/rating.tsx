import { useFocusEffect } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import { palette } from '@/constants/theme';
import { type RatingResponse } from '@/utils/api';
import { useSession } from '@/utils/session';
import { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

export default function RatingScreen() {
  const { api } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<'all' | 'friends'>('all');
  const [data, setData] = useState<RatingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const next = await api.getRating(scope);
      setData(next);
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
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.blue}
            colors={[palette.blue]}
          />
        }>
        <SectionCard>
          <Text style={styles.title}>Rating</Text>
          <SegmentedControl
            options={[
              { label: 'All', value: 'all' },
              { label: 'Friends', value: 'friends' },
            ]}
            value={scope}
            onChange={setScope}
          />
          {data?.currentUser ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                You: {data.currentUser.nickname} | rank {data.currentUserRank ?? '-'} | rating {data.currentUser.rating}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={palette.blue} />
          </View>
        ) : (
          data?.entries.map((entry) => (
            <PlayerCard
              key={entry.id}
              title={`${entry.rank}. ${entry.nickname}`}
              subtitle={`Rating ${entry.rating} | games ${entry.gamesPlayed} | wins ${entry.wins}`}
              highlight={entry.currentUser}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: palette.softAmber,
    borderRadius: 14,
    padding: 12,
  },
  bannerText: {
    color: palette.ink,
    fontWeight: '700',
  },
  loader: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});
