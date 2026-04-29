import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemedStyles } from '@/theme';

export function SectionCard({ children }: { children: ReactNode }) {
  const styles = useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 12,
      padding: 16,
    },
  }));

  return <View style={styles.card}>{children}</View>;
}
