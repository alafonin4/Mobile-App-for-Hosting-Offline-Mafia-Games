import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type UserProfile } from '@/utils/api';
import { useSession } from '@/utils/session';

export default function ProfileScreen() {
  const { api, signOut } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(() => {
    let cancelled = false;

    async function load() {
      const next = await api.getMe();
      if (!cancelled) {
        setProfile(next);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  });

  if (!profile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={palette.blue} size="large" />
      </View>
    );
  }

  return (
    <Screen scroll>
      <SectionCard>
        <AvatarBadge label={profile.nickname} />
        <Text style={styles.name}>{profile.nickname}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        <Text style={styles.meta}>Rating: {profile.rating}</Text>
        <Text style={styles.meta}>Games: {profile.gamesPlayed}</Text>
        <Text style={styles.meta}>Wins: {profile.wins}</Text>
        <Button label="Edit profile" onPress={() => router.push('/edit-profile')} />
        <Button label="Log out" tone="secondary" onPress={() => void signOut()} />
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    alignItems: 'center',
    backgroundColor: palette.sand,
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  email: {
    color: palette.muted,
    textAlign: 'center',
  },
  meta: {
    color: palette.ink,
    fontSize: 15,
  },
});
