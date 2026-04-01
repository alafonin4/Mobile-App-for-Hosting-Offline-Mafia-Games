import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import { palette } from '@/constants/theme';
import { type FriendRequest, type UserSearchResult } from '@/utils/api';
import { useSession } from '@/utils/session';

export default function FriendsScreen() {
  const { api } = useSession();
  const [mode, setMode] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLists() {
    try {
      setLoading(true);
      const [nextFriends, nextIncoming, nextOutgoing] = await Promise.all([
        api.getFriends(),
        api.getIncomingRequests(),
        api.getOutgoingRequests(),
      ]);
      setFriends(nextFriends);
      setIncoming(nextIncoming);
      setOutgoing(nextOutgoing);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot load friends');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void loadLists();
    }, [api])
  );

  async function runSearch() {
    try {
      setSearchResults(await api.searchUsers(query));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot search users');
    }
  }

  async function sendRequest(userId: number) {
    try {
      await api.sendFriendRequest(userId);
      await loadLists();
      await runSearch();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Cannot send request');
    }
  }

  const entries =
    mode === 'friends'
      ? friends.map((item) => ({
        id: item.id,
        title: `${item.senderNickname} / ${item.receiverNickname}`,
        subtitle: 'Accepted friendship',
      }))
      : mode === 'incoming'
        ? incoming.map((item) => ({
          id: item.id,
          title: item.senderNickname || item.senderEmail,
          subtitle: item.senderEmail,
        }))
        : outgoing.map((item) => ({
          id: item.id,
          title: item.receiverNickname || item.receiverEmail,
          subtitle: item.receiverEmail,
        }));

  return (
    <Screen scroll>
      <SectionCard>
        <Text style={styles.title}>Search players</Text>
        <FormField label="Search" value={query} onChangeText={setQuery} />
        <Button label="Find" onPress={() => void runSearch()} />
        {searchResults.map((user) => (
          <View key={user.id} style={styles.searchRow}>
            <View style={styles.flex}>
              <Text style={styles.searchTitle}>{user.nickname}</Text>
              <Text style={styles.searchSubtitle}>{user.email}</Text>
            </View>
            {user.relation === 'NONE' ? (
              <Button label="Add" tone="secondary" onPress={() => void sendRequest(user.id)} />
            ) : (
              <Text style={styles.status}>{relationLabel(user.relation)}</Text>
            )}
          </View>
        ))}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>Lists</Text>
        <SegmentedControl
          options={[
            { label: 'Friends', value: 'friends' },
            { label: 'Incoming', value: 'incoming' },
            { label: 'Outgoing', value: 'outgoing' },
          ]}
          value={mode}
          onChange={setMode}
        />
        {loading ? (
          <ActivityIndicator color={palette.blue} />
        ) : (
          entries.map((item) => (
            <SectionCard key={item.id}>
              <PlayerCard title={item.title} subtitle={item.subtitle} />
              {mode === 'incoming' ? (
                <View style={styles.actions}>
                  <Button
                    label="Accept"
                    tone="secondary"
                    onPress={() => void api.acceptFriendRequest(item.id).then(loadLists)}
                  />
                  <Button
                    label="Reject"
                    tone="secondary"
                    onPress={() => void api.rejectFriendRequest(item.id).then(loadLists)}
                  />
                </View>
              ) : null}
            </SectionCard>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

function relationLabel(relation: UserSearchResult['relation']) {
  switch (relation) {
    case 'SELF':
      return 'You';
    case 'FRIEND':
      return 'Friend';
    case 'INCOMING_REQUEST':
      return 'Incoming';
    case 'OUTGOING_REQUEST':
      return 'Sent';
    default:
      return relation;
  }
}

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  searchRow: {
    alignItems: 'center',
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  searchTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  searchSubtitle: {
    color: palette.muted,
    fontSize: 13,
  },
  status: {
    color: palette.mint,
    fontWeight: '700',
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});