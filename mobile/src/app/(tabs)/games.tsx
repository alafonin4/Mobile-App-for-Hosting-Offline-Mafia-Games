import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';

export default function GamesScreen() {
  return (
    <Screen>
      <SectionCard>
        <Text style={styles.title}>Games</Text>
        <Text style={styles.body}>
          Create a new room with role configuration or join an existing room by code or QR.
        </Text>
        <Button label="Create game" onPress={() => router.push('/create-game')} />
        <Button label="Join room" onPress={() => router.push('/join-room')} tone="secondary" />
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
  body: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
