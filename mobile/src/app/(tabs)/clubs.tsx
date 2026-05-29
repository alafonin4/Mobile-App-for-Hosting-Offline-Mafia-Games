import { type Href, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type ClubSummary } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function ClubsScreen() {
  const { api } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
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
      textTransform: 'uppercase',
    },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: '800',
    },
    copy: {
      color: theme.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    loader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 19,
      fontWeight: '800',
    },
    cardCopy: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    clubCard: {
      gap: 8,
    },
    clubMeta: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
  }));
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadClubs = useCallback(async () => {
    try {
      setLoading(true);
      setClubs(await api.getClubs());
    } catch (error) {
      Alert.alert(t('common.loadFailed'), error instanceof Error ? error.message : t('clubs.cannotLoad'));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useFocusEffect(useCallback(() => {
    void loadClubs();
  }, [loadClubs]));

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert(t('clubs.nameRequired'), t('clubs.nameRequiredCopy'));
      return;
    }

    try {
      setCreating(true);
      const club = await api.createClub({
        name: name.trim(),
        description: description.trim() || null,
      });
      setName('');
      setDescription('');
      await loadClubs();
      router.push(`/clubs/${club.id}` as Href);
    } catch (error) {
      Alert.alert(t('common.createFailed'), error instanceof Error ? error.message : t('clubs.cannotCreate'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('clubs.eyebrow')}</Text>
        <Text style={styles.title}>{t('clubs.title')}</Text>
        <Text style={styles.copy}>
          {t('clubs.copy')}
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.cardTitle}>{t('clubs.createTitle')}</Text>
        <Text style={styles.cardCopy}>{t('clubs.createCopy')}</Text>
        <FormField label={t('clubs.name')} value={name} onChangeText={setName} placeholder={t('clubs.namePlaceholder')} />
        <FormField label={t('clubs.description')} value={description} onChangeText={setDescription} multiline placeholder={t('clubs.descriptionPlaceholder')} />
        <Button label={creating ? t('clubs.creating') : t('clubs.create')} onPress={() => void handleCreate()} disabled={creating} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.cardTitle}>{t('clubs.yourClubs')}</Text>
        <Text style={styles.cardCopy}>{t('clubs.yourClubsCopy')}</Text>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : clubs.length ? (
          clubs.map((club) => (
            <Pressable key={club.id} style={styles.clubCard} onPress={() => router.push(`/clubs/${club.id}` as Href)}>
              <Text style={styles.cardTitle}>{club.name}</Text>
              <Text style={styles.cardCopy}>{club.description ?? t('clubs.noDescription')}</Text>
              <Text style={styles.clubMeta}>
                {club.memberCount} {t('common.members')} / {club.role === 'OWNER' ? t('common.owner') : t('common.member')}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.cardCopy}>{t('clubs.empty')}</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
