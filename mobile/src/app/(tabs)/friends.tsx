import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { PlayerCard } from '@/components/player-card';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type FriendRequest, type UserSearchResult } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function FriendsScreen() {
  const { api, session } = useSession();
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
    searchRow: {
      alignItems: 'center',
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      padding: 14,
    },
    searchTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700',
    },
    searchSubtitle: {
      color: theme.textMuted,
      fontSize: 13,
    },
    status: {
      color: theme.success,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    flex: {
      flex: 1,
      gap: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    hint: {
      color: theme.textMuted,
      fontSize: 12,
    },
    empty: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
  }));
  const [mode, setMode] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLists = useCallback(async () => {
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
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('friends.cannotLoad'));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useFocusEffect(
    useCallback(() => {
      void loadLists();
    }, [loadLists])
  );

  async function runSearch() {
    try {
      setSearchResults(await api.searchUsers(query.trim()));
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('friends.cannotSearch'));
    }
  }

  async function sendRequest(userId: number) {
    try {
      await api.sendFriendRequest(userId);
      await loadLists();
      await runSearch();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('friends.cannotSend'));
    }
  }

  async function acceptRequest(requestId: number) {
    try {
      await api.acceptFriendRequest(requestId);
      await loadLists();
      await runSearch();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('friends.cannotAccept'));
    }
  }

  async function rejectRequest(requestId: number) {
    try {
      await api.rejectFriendRequest(requestId);
      await loadLists();
      await runSearch();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('friends.cannotReject'));
    }
  }

  async function cancelRequest(requestId: number) {
    try {
      await api.cancelFriendRequest(requestId);
      await loadLists();
      await runSearch();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('friends.cannotCancel'));
    }
  }

  function openUserProfile(userId: number) {
    if (userId === session.userId) {
      router.push('/profile');
      return;
    }

    router.push(`/users/${userId}` as never);
  }

  const entries =
    mode === 'friends'
      ? friends.map((item) => {
          const otherUser = friendPeer(item, session.userId);
          return {
            id: item.id,
            userId: otherUser.id,
            title: otherUser.nickname,
            subtitle: otherUser.email,
          };
        })
      : mode === 'incoming'
        ? incoming.map((item) => ({
            id: item.id,
            userId: item.senderId,
            title: item.senderNickname || item.senderEmail,
            subtitle: item.senderEmail,
          }))
        : outgoing.map((item) => ({
            id: item.id,
            userId: item.receiverId,
            title: item.receiverNickname || item.receiverEmail,
            subtitle: item.receiverEmail,
          }));

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('friends.eyebrow')}</Text>
        <Text style={styles.title}>{t('friends.title')}</Text>
        <Text style={styles.copy}>
          {t('friends.copy')}
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>{t('friends.search')}</Text>
        <FormField
          label={t('friends.findPlayer')}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => void runSearch()}
          placeholder={t('friends.placeholder')}
          returnKeyType="search"
        />
        <Button label={t('friends.searchCircle')} onPress={() => void runSearch()} />
        {searchResults.length
          ? searchResults.map((user) => (
              <View key={user.id} style={styles.searchRow}>
                <Pressable style={styles.flex} onPress={() => openUserProfile(user.id)}>
                  <Text style={styles.searchTitle}>{user.nickname}</Text>
                  <Text style={styles.searchSubtitle}>{user.email}</Text>
                </Pressable>
                {user.relation === 'NONE' ? (
                  <Button label={t('friends.add')} tone="secondary" onPress={() => void sendRequest(user.id)} />
                ) : (
                  <Text style={styles.status}>{relationLabel(user.relation, t)}</Text>
                )}
              </View>
            ))
          : null}
      </SectionCard>

      <SectionCard>
        <Text style={styles.title}>{t('friends.requests')}</Text>
        <SegmentedControl
          options={[
            { label: t('friends.friends'), value: 'friends' },
            { label: t('friends.incoming'), value: 'incoming' },
            { label: t('friends.outgoing'), value: 'outgoing' },
          ]}
          value={mode}
          onChange={setMode}
        />
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : entries.length ? (
          entries.map((item) => (
            <SectionCard key={item.id}>
              <Pressable onPress={() => openUserProfile(item.userId)}>
                <PlayerCard title={item.title} subtitle={item.subtitle} />
              </Pressable>
              {mode === 'friends' ? <Text style={styles.hint}>{t('friends.openCardHint')}</Text> : null}
              {mode === 'incoming' ? (
                <View style={styles.actions}>
                  <Button label={t('friends.accept')} tone="secondary" onPress={() => void acceptRequest(item.id)} />
                  <Button label={t('friends.decline')} tone="secondary" onPress={() => void rejectRequest(item.id)} />
                </View>
              ) : null}
              {mode === 'outgoing' ? (
                <View style={styles.actions}>
                  <Button label={t('friends.cancel')} tone="secondary" onPress={() => void cancelRequest(item.id)} />
                </View>
              ) : null}
            </SectionCard>
          ))
        ) : (
          <Text style={styles.empty}>{t('friends.empty')}</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

function friendPeer(item: FriendRequest, currentUserId: number | null) {
  if (item.senderId === currentUserId) {
    return {
      id: item.receiverId,
      nickname: item.receiverNickname || item.receiverEmail,
      email: item.receiverEmail,
    };
  }

  return {
    id: item.senderId,
    nickname: item.senderNickname || item.senderEmail,
    email: item.senderEmail,
  };
}

function relationLabel(relation: UserSearchResult['relation'], t: (key: string) => string) {
  switch (relation) {
    case 'SELF':
      return t('friends.you');
    case 'FRIEND':
      return t('friends.friend');
    case 'INCOMING_REQUEST':
      return t('friends.incoming');
    case 'OUTGOING_REQUEST':
      return t('friends.sent');
    default:
      return relation;
  }
}
