import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { RolePickerModal } from '@/components/role-picker-modal';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type RoleCatalogItem } from '@/utils/api';
import { buildRoomRoles, sumCounts } from '@/utils/game-builder';
import { useSession } from '@/utils/session';
import { createRoomSchema } from '@/validation/game';

export default function CreateGameScreen() {
  const { api } = useSession();
  const [roomName, setRoomName] = useState('');
  const [playerCount, setPlayerCount] = useState('10');
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
        const [nextMafia, nextTown] = await Promise.all([api.getMafiaRoles(), api.getTownRoles()]);
        setMafiaRoles(nextMafia);
        setTownRoles(nextTown);
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load role catalog');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [api]);

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
    console.log("creating room started");
    const parsed = createRoomSchema.safeParse({
      name: roomName.trim() || undefined,
      playerCount: totalPlayers,
    });

    if (!parsed.success) {
      Alert.alert('Invalid room', parsed.error.issues[0]?.message ?? 'Check room settings');
      return;
    }

    try {
      setSubmitting(true);
      const room = await api.createRoom({
        name: parsed.data.name ?? '',
        roles: buildRoomRoles(parsed.data.playerCount, mafiaRoles, townRoles, counts),
      });
      router.replace(`/lobby/${room.roomId}`);
    } catch (error) {
      Alert.alert('Create room failed', error instanceof Error ? error.message : 'Cannot create room');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={palette.blue} size="large" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <SectionCard>
        <Text style={styles.title}>Room settings</Text>
        <FormField label="Room name" value={roomName} onChangeText={setRoomName} placeholder="Mafia room" />
        <FormField label="Players count" value={playerCount} onChangeText={setPlayerCount} keyboardType="number-pad" />
        <Text style={styles.meta}>Mafia limit: {mafiaLimit}</Text>
        <Text style={styles.meta}>Selected mafia roles: {mafiaSelected}</Text>
        <Text style={styles.meta}>Selected roles total: {allSelected}</Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Roles</Text>
        <Button label="Pick mafia roles" tone="secondary" onPress={() => setPicker('mafia')} />
        <Button label="Pick town roles" tone="secondary" onPress={() => setPicker('town')} />
        <Text style={styles.summaryTitle}>Mafia</Text>
        {mafiaRoles.filter((item) => (counts[item.id] ?? 0) > 0).map((item) => (
          <Text key={item.id} style={styles.summaryLine}>
            {item.name}: {counts[item.id] ?? 0}
          </Text>
        ))}
        <Text style={styles.summaryTitle}>Town</Text>
        {townRoles.filter((item) => (counts[item.id] ?? 0) > 0).map((item) => (
          <Text key={item.id} style={styles.summaryLine}>
            {item.name}: {counts[item.id] ?? 0}
          </Text>
        ))}
      </SectionCard>

      <Button label={submitting ? 'Creating...' : 'Create room'} onPress={() => void createRoom()} disabled={submitting} />

      <RolePickerModal
        visible={picker !== null}
        title={picker === 'mafia' ? 'Mafia roles' : 'Town roles'}
        items={picker === 'mafia' ? mafiaRoles : townRoles}
        counts={counts}
        onChange={adjust}
        onClose={() => setPicker(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    color: palette.ink,
    fontSize: 15,
  },
  summaryTitle: {
    color: palette.blue,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryLine: {
    color: palette.muted,
    fontSize: 14,
  },
});
