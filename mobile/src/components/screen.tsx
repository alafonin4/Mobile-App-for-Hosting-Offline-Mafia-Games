import type { ReactElement, ReactNode } from 'react';
import type { RefreshControlProps } from 'react-native';
import { SafeAreaView, ScrollView, View } from 'react-native';

import { useThemedStyles } from '@/theme';

export function Screen({
  children,
  scroll = false,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const styles = useThemedStyles((colors) => ({
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      gap: 16,
      padding: 16,
    },
  }));

  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}
