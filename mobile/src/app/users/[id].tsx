import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type RelatedUserProfile, type RoleCatalogItem } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function UserProfileScreen() {
  const { api } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
    loader: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    hero: {
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.accent,
      borderWidth: 1,
    },
    eyebrow: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    name: {
      color: theme.text,
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
    },
    email: {
      color: theme.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    statRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
    },
    statCard: {
      alignItems: 'center',
      backgroundColor: theme.primarySoft,
      borderRadius: 18,
      minWidth: 96,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    statValue: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '800',
    },
    statLabel: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '800',
    },
    preferenceLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    preferenceValue: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 22,
    },
  }));
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const [profile, setProfile] = useState<RelatedUserProfile | null>(null);
  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = Array.isArray(params.id) ? Number(params.id[0]) : Number(params.id);

  const load = useCallback(async () => {
    if (!Number.isFinite(userId)) {
      Alert.alert(t('common.error'), t('user.invalidProfileId'));
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
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('user.cannotLoad'));
    } finally {
      setLoading(false);
    }
  }, [api, userId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function roleNames(roleIds: string[]) {
    if (roleIds.length === 0) {
      return t('common.notSpecified');
    }

    return roleIds.map((roleId) => roles.find((item) => item.id === roleId)?.name ?? roleId).join(', ');
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
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('user.cannotUpdateRelation'));
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
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('user.cannotUpdateRelation'));
    }
  }

  if (loading || !profile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('user.guestCard')}</Text>
        <AvatarBadge label={profile.nickname} avatarUrl={profile.avatarUrl} size={104} />
        <Text style={styles.name}>{profile.nickname}</Text>
        <Text style={styles.email}>{profile.email}</Text>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.rating}</Text>
            <Text style={styles.statLabel}>{t('common.rating')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.gamesPlayed}</Text>
            <Text style={styles.statLabel}>{t('common.games')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.wins}</Text>
            <Text style={styles.statLabel}>{t('common.wins')}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>{t('profile.playingTaste')}</Text>
        <Text style={styles.preferenceLabel}>{t('profile.favoriteRoles')}</Text>
        <Text style={styles.preferenceValue}>{roleNames(profile.favoriteRoleIds)}</Text>
        <Text style={styles.preferenceLabel}>{t('profile.dislikedRoles')}</Text>
        <Text style={styles.preferenceValue}>{roleNames(profile.dislikedRoleIds)}</Text>
      </SectionCard>

      <SectionCard>
        {profile.relation === 'FRIEND' ? (
          <Button label={t('user.openDossier')} onPress={() => router.push(`/dossier/${profile.id}` as never)} />
        ) : null}
        {profile.relation === 'NONE' ? <Button label={t('user.addToCircle')} onPress={() => void handlePrimaryAction()} /> : null}
        {profile.relation === 'INCOMING_REQUEST' ? (
          <>
            <Button label={t('user.acceptRequest')} onPress={() => void handlePrimaryAction()} />
            <Button label={t('user.declineRequest')} tone="secondary" onPress={() => void handleSecondaryAction()} />
          </>
        ) : null}
        {profile.relation === 'OUTGOING_REQUEST' ? (
          <Button label={t('user.cancelRequest')} tone="secondary" onPress={() => void handleSecondaryAction()} />
        ) : null}
        {profile.relation === 'FRIEND' ? (
          <Button label={t('user.removeFromCircle')} tone="secondary" onPress={() => void handlePrimaryAction()} />
        ) : null}
      </SectionCard>
    </Screen>
  );
}
