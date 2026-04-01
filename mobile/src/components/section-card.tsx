import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';

export function SectionCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.cream,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
});
