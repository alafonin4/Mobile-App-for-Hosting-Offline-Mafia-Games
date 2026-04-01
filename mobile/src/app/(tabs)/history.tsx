import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type HistoryListItem } from '@/utils/api';
import { useSession } from '@/utils/session';
import { useCallback } from 'react';

export default function HistoryScreen() {
  const { api } = useSession();
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
  try {
    setRefreshing(true);
    const next = await api.getHistory();
    setItems(next);
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [api])
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
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>All finished games you participated in.</Text>
      </SectionCard>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={palette.blue} />
        </View>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/history-details/${item.id}`)}>
            <SectionCard>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>
                Winner: {item.winner} | players {item.participantCount}
              </Text>
            </SectionCard>
          </Pressable>
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
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  rowTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: palette.muted,
    fontSize: 13,
  },
});
