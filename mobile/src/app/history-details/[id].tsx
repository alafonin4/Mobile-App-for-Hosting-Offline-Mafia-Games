import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';

import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { VoteRoundCard } from '@/components/vote-round-card';
import { palette } from '@/constants/theme';
import { type HistoryDetail } from '@/utils/api';
import { useSession } from '@/utils/session';

export default function HistoryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useSession();
  const [details, setDetails] = useState<HistoryDetail | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setDetails(await api.getHistoryDetails(Number(id)));
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load game details');
      }
    }

    void load();
  }, [api, id]);

  if (!details) {
    return (
      <Screen>
        <ActivityIndicator color={palette.blue} size="large" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <SectionCard>
        <Text style={styles.title}>{details.name}</Text>
        <Text style={styles.meta}>Winner: {details.winner}</Text>
        <Text style={styles.meta}>Nights: {details.nightNumber}</Text>
        <Text style={styles.meta}>Days: {details.dayNumber}</Text>
      </SectionCard>
      <SectionCard>
        <Text style={styles.title}>Players</Text>
        {details.players.map((player) => (
          <PlayerCard
            key={player.userId}
            title={player.email}
            subtitle={`${player.role} | ${player.status}`}
            highlight={player.host}
          />
        ))}
      </SectionCard>
      <SectionCard>
        <Text style={styles.title}>Votes</Text>
        {details.voteHistory.length ? (
          details.voteHistory.map((voteRound) => <VoteRoundCard key={voteRound.id} voteRound={voteRound} />)
        ) : (
          <Text style={styles.meta}>No saved vote history for this game.</Text>
        )}
      </SectionCard>
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
});
