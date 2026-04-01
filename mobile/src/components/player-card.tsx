import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';

export function PlayerCard({
  title,
  subtitle,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.card, highlight && styles.highlighted]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  highlighted: {
    backgroundColor: '#fff8ef',
    borderColor: palette.amber,
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
