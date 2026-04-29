import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/theme';

export function PlayerCard({
  title,
  subtitle,
  highlight = false,
  style,
}: {
  title: string;
  subtitle: string;
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 4,
      padding: 14,
    },
    highlighted: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
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
    <View style={[styles.card, highlight && styles.highlighted, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
