import { Text, View } from 'react-native';

import { type VoteRound } from '@/utils/api';
import { useThemedStyles } from '@/theme';

export function VoteRoundCard({ voteRound }: { voteRound: VoteRound }) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 4,
      padding: 12,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
    },
  }));

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
