import { Text, View } from 'react-native';

import { type VoteRound } from '@/utils/api';
import { useThemedStyles } from '@/theme';
import { useLocalization } from '@/utils/localization';

export function VoteRoundCard({ voteRound }: { voteRound: VoteRound }) {
  const { t } = useLocalization();
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
      padding: 14,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {t('game.round')} {voteRound.roundNumber} - {voteRound.type}
      </Text>
      <Text style={styles.subtitle}>{t('common.voteStatus')}: {voteRound.status}</Text>
      {Object.entries(voteRound.tally).map(([targetId, votes]) => (
        <Text key={targetId} style={styles.subtitle}>
          {t('common.player')} {targetId}: {votes} {t('common.votes')}
        </Text>
      ))}
    </View>
  );
}
