import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type RoleCatalogItem, type UserProfile } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function ProfileScreen() {
  const { api, signOut } = useSession();
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
      backgroundColor: theme.accentSoft,
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);

  useFocusEffect(
    useCallback(() => {
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
    }, [api])
  );

  function roleNames(roleIds: string[]) {
    if (roleIds.length === 0) {
      return t('common.notSpecified');
    }

    return roleIds.map((roleId) => roles.find((item) => item.id === roleId)?.name ?? roleId).join(', ');
  }

  if (!profile) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('profile.memberProfile')}</Text>
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
        <Button label={t('profile.viewDossier')} onPress={() => router.push('/dossier/me' as never)} />
        <Button label={t('profile.editProfile')} onPress={() => router.push('/edit-profile')} />
        <Button label={t('profile.logOut')} tone="secondary" onPress={() => void signOut()} />
      </SectionCard>
    </Screen>
  );
}
