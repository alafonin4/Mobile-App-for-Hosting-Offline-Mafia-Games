import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { type VoteRound } from '@/utils/api';

export function VoteRoundCard({ voteRound }: { voteRound: VoteRound }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Round {voteRound.roundNumber} - {voteRound.type}
      </Text>
      <Text style={styles.subtitle}>Status: {voteRound.status}</Text>
      {Object.entries(voteRound.tally).map(([targetId, votes]) => (
        <Text key={targetId} style={styles.subtitle}>
          Player {targetId}: {votes} votes
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  title: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
  },
});
