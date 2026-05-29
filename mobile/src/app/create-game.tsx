import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { RolePickerModal } from '@/components/role-picker-modal';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type ClubSummary, type RoleCatalogItem } from '@/utils/api';
import { buildRoomRoles, sumCounts } from '@/utils/game-builder';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';
import { createRoomSchema } from '@/validation/game';

export default function CreateGameScreen() {
  const params = useLocalSearchParams<{ clubId?: string }>();
  const initialClubId = Number.parseInt(params.clubId ?? '', 10);
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
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metaCard: {
      backgroundColor: theme.primarySoft,
      borderRadius: 18,
      minWidth: '47%',
      padding: 14,
    },
    metaLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '800',
    },
    summaryTitle: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    summaryLine: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
    },
    clubButton: {
      gap: 4,
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    clubButtonActive: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    clubName: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
    },
    clubMeta: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  }));
  const [roomName, setRoomName] = useState('');
  const [playerCount, setPlayerCount] = useState('10');
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(Number.isFinite(initialClubId) ? initialClubId : null);
  const [mafiaRoles, setMafiaRoles] = useState<RoleCatalogItem[]>([]);
  const [townRoles, setTownRoles] = useState<RoleCatalogItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState<'mafia' | 'town' | null>(null);

  const totalPlayers = Number.parseInt(playerCount, 10) || 0;
  const mafiaLimit = Math.floor(totalPlayers / 3);
  const mafiaSelected = sumCounts(mafiaRoles, counts);
  const allSelected = mafiaSelected + sumCounts(townRoles, counts);

  useEffect(() => {
    async function load() {
      try {
        const [nextMafia, nextTown, nextClubs] = await Promise.all([
          api.getMafiaRoles(),
          api.getTownRoles(),
          api.getClubs(),
        ]);
        setMafiaRoles(nextMafia);
        setTownRoles(nextTown);
        setClubs(nextClubs);
        if (Number.isFinite(initialClubId) && nextClubs.some((club) => club.id === initialClubId)) {
          setSelectedClubId(initialClubId);
        }
      } catch (error) {
        Alert.alert(t('common.error'), error instanceof Error ? error.message : t('createGame.cannotLoadCatalog'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [api, initialClubId, t]);

  function adjust(item: RoleCatalogItem, nextValue: number) {
    const current = counts[item.id] ?? 0;
    const delta = nextValue - current;

    if (delta === 0 || nextValue < 0) {
      return;
    }
    if (item.faction === 'MAFIA' && mafiaSelected + delta > mafiaLimit) {
      return;
    }
    if (allSelected + delta > totalPlayers) {
      return;
    }

    setCounts((previous) => ({ ...previous, [item.id]: nextValue }));
  }

  async function createRoom() {
    const parsed = createRoomSchema.safeParse({
      name: roomName.trim() || undefined,
      playerCount: totalPlayers,
    });

    if (!parsed.success) {
      Alert.alert(t('common.invalidRoom'), t('createGame.checkSettings'));
      return;
    }

    try {
      setSubmitting(true);
      const room = await api.createRoom({
        name: parsed.data.name ?? '',
        clubId: selectedClubId,
        roles: buildRoomRoles(parsed.data.playerCount, mafiaRoles, townRoles, counts),
      });
      router.replace(`/lobby/${room.roomId}` as never);
    } catch (error) {
      Alert.alert(t('common.createFailed'), error instanceof Error ? error.message : t('createGame.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('createGame.eyebrow')}</Text>
        <Text style={styles.title}>{t('createGame.title')}</Text>
        <Text style={styles.copy}>
          {t('createGame.copy')}
        </Text>
      </SectionCard>

      {clubs.length ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('createGame.clubContext')}</Text>
          <Pressable style={[styles.clubButton, selectedClubId === null && styles.clubButtonActive]} onPress={() => setSelectedClubId(null)}>
            <Text style={styles.clubName}>{t('createGame.independentTable')}</Text>
            <Text style={styles.clubMeta}>{t('createGame.independentCopy')}</Text>
          </Pressable>
          {clubs.map((club) => (
            <Pressable
              key={club.id}
              style={[styles.clubButton, selectedClubId === club.id && styles.clubButtonActive]}
              onPress={() => setSelectedClubId(club.id)}
            >
              <Text style={styles.clubName}>{club.name}</Text>
              <Text style={styles.clubMeta}>
                {club.memberCount} {t('common.members')} / {club.description ?? t('club.privateArchive')}
              </Text>
            </Pressable>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard>
        <Text style={styles.sectionTitle}>{t('createGame.roomSettings')}</Text>
        <FormField label={t('createGame.roomName')} value={roomName} onChangeText={setRoomName} placeholder={t('createGame.roomPlaceholder')} />
        <FormField label={t('createGame.playerCount')} value={playerCount} onChangeText={setPlayerCount} keyboardType="number-pad" />
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('createGame.mafiaLimit')}</Text>
            <Text style={styles.metaValue}>{mafiaLimit}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('createGame.mafiaChosen')}</Text>
            <Text style={styles.metaValue}>{mafiaSelected}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('createGame.rolesTotal')}</Text>
            <Text style={styles.metaValue}>{allSelected}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{t('createGame.remainingSeats')}</Text>
            <Text style={styles.metaValue}>{Math.max(0, totalPlayers - allSelected)}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>{t('createGame.curateCast')}</Text>
        <Button label={t('createGame.selectMafia')} tone="secondary" onPress={() => setPicker('mafia')} />
        <Button label={t('createGame.selectTown')} tone="secondary" onPress={() => setPicker('town')} />
        <Text style={styles.summaryTitle}>{t('createGame.mafiaSelection')}</Text>
        {mafiaRoles.filter((item) => (counts[item.id] ?? 0) > 0).map((item) => (
          <Text key={item.id} style={styles.summaryLine}>
            {item.name}: {counts[item.id] ?? 0}
          </Text>
        ))}
        <Text style={styles.summaryTitle}>{t('createGame.townSelection')}</Text>
        {townRoles.filter((item) => (counts[item.id] ?? 0) > 0).map((item) => (
          <Text key={item.id} style={styles.summaryLine}>
            {item.name}: {counts[item.id] ?? 0}
          </Text>
        ))}
      </SectionCard>

      <Button label={submitting ? t('createGame.openingRoom') : t('createGame.openTable')} onPress={() => void createRoom()} disabled={submitting} />

      <RolePickerModal
        visible={picker !== null}
        title={picker === 'mafia' ? t('createGame.mafiaRoles') : t('createGame.townRoles')}
        items={picker === 'mafia' ? mafiaRoles : townRoles}
        counts={counts}
        onChange={adjust}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}
