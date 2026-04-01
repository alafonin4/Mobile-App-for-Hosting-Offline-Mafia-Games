import type { ReactElement, ReactNode } from 'react';
import type { RefreshControlProps } from 'react-native';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';

export function Screen({
  children,
  scroll = false,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
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

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.sand,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 16,
  },
});
