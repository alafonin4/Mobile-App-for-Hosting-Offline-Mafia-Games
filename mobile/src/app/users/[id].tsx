import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type RelatedUserProfile, type RoleCatalogItem } from '@/utils/api';
import { useSession } from '@/utils/session';

export default function UserProfileScreen() {
  const { api } = useSession();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const [profile, setProfile] = useState<RelatedUserProfile | null>(null);
  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = Array.isArray(params.id) ? Number(params.id[0]) : Number(params.id);

  const load = useCallback(async () => {
    if (!Number.isFinite(userId)) {
      Alert.alert('Error', 'Invalid profile id');
      router.back();
      return;
    }

    try {
      setLoading(true);
      const [nextProfile, mafiaRoles, townRoles] = await Promise.all([
        api.getUserProfile(userId),
        api.getMafiaRoles(),
        api.getTownRoles(),
      ]);

      setProfile(nextProfile);
      setRoles([...mafiaRoles, ...townRoles]);

      if (nextProfile.relation === 'SELF') {
        router.replace('/profile');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load profile');
    } finally {
      setLoading(false);
    }
  }, [api, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function roleNames(roleIds: string[]) {
    if (roleIds.length === 0) {
      return 'Not specified';
    }

    return roleIds
      .map((roleId) => roles.find((item) => item.id === roleId)?.name ?? roleId)
      .join(', ');
  }

  async function handlePrimaryAction() {
    if (!profile) {
      return;
    }

    try {
      if (profile.relation === 'NONE') {
        await api.sendFriendRequest(profile.id);
      } else if (profile.relation === 'INCOMING_REQUEST' && profile.requestId) {
        await api.acceptFriendRequest(profile.requestId);
      } else if (profile.relation === 'FRIEND') {
        await api.removeFriend(profile.id);
      }

      await load();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot update relation');
    }
  }

  async function handleSecondaryAction() {
    if (!profile?.requestId) {
      return;
    }

    try {
      if (profile.relation === 'INCOMING_REQUEST') {
        await api.rejectFriendRequest(profile.requestId);
      } else if (profile.relation === 'OUTGOING_REQUEST') {
        await api.cancelFriendRequest(profile.requestId);
      }

      await load();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot update relation');
    }
  }

  if (loading || !profile) {
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
        {profile.relation === 'NONE' ? (
          <Button label="Add to friends" onPress={() => void handlePrimaryAction()} />
        ) : null}
        {profile.relation === 'INCOMING_REQUEST' ? (
          <>
            <Button label="Accept request" onPress={() => void handlePrimaryAction()} />
            <Button label="Reject request" tone="secondary" onPress={() => void handleSecondaryAction()} />
          </>
        ) : null}
        {profile.relation === 'OUTGOING_REQUEST' ? (
          <Button label="Reject request" tone="secondary" onPress={() => void handleSecondaryAction()} />
        ) : null}
        {profile.relation === 'FRIEND' ? (
          <Button label="Remove from friends" tone="secondary" onPress={() => void handlePrimaryAction()} />
        ) : null}
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
