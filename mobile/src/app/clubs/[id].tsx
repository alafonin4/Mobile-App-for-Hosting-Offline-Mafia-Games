import { useFocusEffect } from '@react-navigation/native';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type ClubDetail, type FriendRequest, type HistoryListItem } from '@/utils/api';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = Number.parseInt(id ?? '', 10);
  const { api, session } = useSession();
  const { colors } = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemedStyles((theme) => ({
    loader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 36,
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
    sectionTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: '800',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    rowContent: {
      flex: 1,
      gap: 4,
      justifyContent: 'center',
    },
    rowTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
    },
    rowMeta: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    rowCard: {
      gap: 12,
    },
  }));
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [history, setHistory] = useState<HistoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null);

  const loadClub = useCallback(async () => {
    if (!Number.isFinite(clubId)) {
      return;
    }

    try {
      setLoading(true);
      const [nextClub, nextFriends, nextHistory] = await Promise.all([
        api.getClub(clubId),
        api.getFriends(),
        api.getClubHistory(clubId),
      ]);
      setClub(nextClub);
      setFriends(nextFriends);
      setHistory(nextHistory);
    } catch (error) {
      Alert.alert(t('common.loadFailed'), error instanceof Error ? error.message : t('club.cannotLoad'));
    } finally {
      setLoading(false);
    }
  }, [api, clubId, t]);

  useFocusEffect(useCallback(() => {
    void loadClub();
  }, [loadClub]));

  async function inviteMember(userId: number) {
    if (!club) {
      return;
    }

    try {
      setInvitingUserId(userId);
      const nextClub = await api.inviteMemberToClub(club.id, userId);
      setClub(nextClub);
    } catch (error) {
      Alert.alert(t('common.inviteFailed'), error instanceof Error ? error.message : t('club.cannotInvite'));
    } finally {
      setInvitingUserId(null);
    }
  }

  if (loading || !club) {
    return (
      <Screen scroll>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  const existingMemberIds = new Set(club.members.map((member) => member.userId));
  const resolvedFriends = friends
    .map((friend) => {
      const otherIsSender = friend.senderId !== session.userId;
      const userId = otherIsSender ? friend.senderId : friend.receiverId;
      const nickname = otherIsSender ? friend.senderNickname : friend.receiverNickname;
      const email = otherIsSender ? friend.senderEmail : friend.receiverEmail;
      const avatarUrl = otherIsSender ? friend.senderAvatarUrl : friend.receiverAvatarUrl;
      return { userId, nickname, email, avatarUrl };
    })
    .filter((friend) => !existingMemberIds.has(friend.userId));

  return (
    <Screen scroll>
      <SectionCard style={styles.hero}>
        <Text style={styles.eyebrow}>{t('nav.club')}</Text>
        <Text style={styles.title}>{club.name}</Text>
        <Text style={styles.copy}>{club.description ?? t('club.defaultDescription')}</Text>
        <Text style={styles.rowMeta}>
          {club.memberCount} {t('common.members')} / {club.role === 'OWNER' ? t('club.ownerMeta') : t('club.memberMeta')}
        </Text>
        <Button
          label={t('club.hostTable')}
          onPress={() => router.push(`/create-game?clubId=${club.id}&clubName=${encodeURIComponent(club.name)}` as Href)}
        />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>{t('club.membersTitle')}</Text>
        {club.members.map((member) => (
          <View key={member.userId} style={styles.row}>
            <AvatarBadge label={member.nickname} avatarUrl={member.avatarUrl} size={52} />
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{member.nickname}</Text>
              <Text style={styles.rowMeta}>
                {member.role === 'OWNER' ? t('common.owner') : t('common.member')} / {member.status === 'ACTIVE' ? t('common.active') : t('common.invited')}
              </Text>
            </View>
          </View>
        ))}
      </SectionCard>

      {club.role === 'OWNER' ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>{t('club.inviteFriends')}</Text>
          {resolvedFriends.length ? (
            resolvedFriends.map((friend) => (
              <View key={friend.userId} style={styles.rowCard}>
                <View style={styles.row}>
                  <AvatarBadge label={friend.nickname} avatarUrl={friend.avatarUrl} size={52} />
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{friend.nickname}</Text>
                    <Text style={styles.rowMeta}>{friend.email}</Text>
                  </View>
                </View>
                <Button
                  label={invitingUserId === friend.userId ? t('club.inviting') : t('club.inviteToClub')}
                  tone="secondary"
                  onPress={() => void inviteMember(friend.userId)}
                  disabled={invitingUserId === friend.userId}
                />
              </View>
            ))
          ) : (
            <Text style={styles.rowMeta}>{t('club.noFriends')}</Text>
          )}
        </SectionCard>
      ) : null}

      <SectionCard>
        <Text style={styles.sectionTitle}>{t('club.archive')}</Text>
        {history.length ? (
          history.map((item) => (
            <Pressable key={item.id} style={styles.rowCard} onPress={() => router.push(`/history-details/${item.id}` as Href)}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {item.winner} / {new Date(item.finishedAt).toLocaleDateString()} / {item.participantCount} {t('common.players').toLowerCase()}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.rowMeta}>{t('club.noHistory')}</Text>
        )}
      </SectionCard>
    </Screen>
  );
}
