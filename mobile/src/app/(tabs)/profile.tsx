import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type RoleCatalogItem, type UserProfile } from '@/utils/api';
import { useSession } from '@/utils/session';

export default function ProfileScreen() {
  const { api, signOut } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);

  useFocusEffect(() => {
    let cancelled = false;

    async function load() {
      const [nextProfile, mafiaRoles, townRoles] = await Promise.all([api.getMe(), api.getMafiaRoles(), api.getTownRoles()]);
      if (!cancelled) {
        setProfile(nextProfile);
        setRoles([...mafiaRoles, ...townRoles]);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  });

  function roleNames(roleIds: string[]) {
    if (roleIds.length === 0) {
      return 'Not specified';
    }

    return roleIds
      .map((roleId) => roles.find((item) => item.id === roleId)?.name ?? roleId)
      .join(', ');
  }

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
        <AvatarBadge label={profile.nickname} avatarUrl={profile.avatarUrl} />
        <Text style={styles.name}>{profile.nickname}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        <Text style={styles.meta}>Rating: {profile.rating}</Text>
        <Text style={styles.meta}>Games: {profile.gamesPlayed}</Text>
        <Text style={styles.meta}>Wins: {profile.wins}</Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Role preferences</Text>
        <Text style={styles.preferenceLabel}>Favorite roles</Text>
        <Text style={styles.preferenceValue}>{roleNames(profile.favoriteRoleIds)}</Text>
        <Text style={styles.preferenceLabel}>Disliked roles</Text>
        <Text style={styles.preferenceValue}>{roleNames(profile.dislikedRoleIds)}</Text>
      </SectionCard>

      <SectionCard>
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
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  preferenceLabel: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  preferenceValue: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
