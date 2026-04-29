import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { RolePreferencePickerModal } from '@/components/role-preference-picker-modal';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { type RoleCatalogItem } from '@/utils/api';
import { useSession } from '@/utils/session';
import { profileSchema } from '@/validation/profile';

const MAX_ROLE_SELECTION = 3;

export default function EditProfileScreen() {
  const { api } = useSession();
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [favoriteRoleIds, setFavoriteRoleIds] = useState<string[]>([]);
  const [dislikedRoleIds, setDislikedRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePicker, setActivePicker] = useState<'favorite' | 'disliked' | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [me, mafiaRoles, townRoles] = await Promise.all([api.getMe(), api.getMafiaRoles(), api.getTownRoles()]);
        setNickname(me.nickname);
        setAvatarUrl(me.avatarUrl ?? '');
        setFavoriteRoleIds(me.favoriteRoleIds);
        setDislikedRoleIds(me.dislikedRoleIds);
        setRoles([...mafiaRoles, ...townRoles].sort((left, right) => left.name.localeCompare(right.name)));
      } catch (error) {
        Alert.alert('Load failed', error instanceof Error ? error.message : 'Cannot load profile');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [api]);

  async function chooseAvatarFromGallery() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Allow access to your photo library to choose an avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.base64) {
        Alert.alert('Image error', 'Cannot read the selected image');
        return;
      }

      setAvatarUrl(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert('Image error', error instanceof Error ? error.message : 'Cannot open gallery');
    }
  }

  function toggleRoleSelection(item: RoleCatalogItem, target: 'favorite' | 'disliked') {
    if (target === 'favorite') {
      const isSelected = favoriteRoleIds.includes(item.id);
      if (isSelected) {
        setFavoriteRoleIds((current) => current.filter((roleId) => roleId !== item.id));
        return;
      }
      if (favoriteRoleIds.length >= MAX_ROLE_SELECTION) {
        return;
      }

      setFavoriteRoleIds((current) => [...current, item.id]);
      setDislikedRoleIds((current) => current.filter((roleId) => roleId !== item.id));
      return;
    }

    const isSelected = dislikedRoleIds.includes(item.id);
    if (isSelected) {
      setDislikedRoleIds((current) => current.filter((roleId) => roleId !== item.id));
      return;
    }
    if (dislikedRoleIds.length >= MAX_ROLE_SELECTION) {
      return;
    }

    setDislikedRoleIds((current) => [...current, item.id]);
    setFavoriteRoleIds((current) => current.filter((roleId) => roleId !== item.id));
  }

  function roleSummary(roleIds: string[]) {
    if (roleIds.length === 0) {
      return 'Tap to choose up to 3 roles';
    }

    return roleIds
      .map((roleId) => roles.find((item) => item.id === roleId)?.name ?? roleId)
      .join(', ');
  }

  async function saveProfile() {
    const parsed = profileSchema.safeParse({ nickname, avatarUrl, favoriteRoleIds, dislikedRoleIds });
    if (!parsed.success) {
      Alert.alert('Invalid profile', parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }

    try {
      setSaving(true);
      await api.updateProfile({
        nickname: parsed.data.nickname,
        avatarUrl: parsed.data.avatarUrl || null,
        favoriteRoleIds: parsed.data.favoriteRoleIds,
        dislikedRoleIds: parsed.data.dislikedRoleIds,
      });
      router.back();
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Cannot save profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={palette.blue} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <SectionCard>
        <Text style={styles.title}>Edit profile</Text>
        <AvatarBadge label={nickname || 'Player'} avatarUrl={avatarUrl || null} />
        <View style={styles.avatarActions}>
          <Button label="Choose from gallery" onPress={() => void chooseAvatarFromGallery()} />
          {avatarUrl ? <Button label="Remove avatar" tone="secondary" onPress={() => setAvatarUrl('')} /> : null}
        </View>
        <FormField label="Nickname" value={nickname} onChangeText={setNickname} />
        <Pressable style={styles.selectorField} onPress={() => setActivePicker('favorite')}>
          <Text style={styles.selectorLabel}>Favorite roles</Text>
          <Text style={styles.selectorValue}>{roleSummary(favoriteRoleIds)}</Text>
        </Pressable>
        <Pressable style={styles.selectorField} onPress={() => setActivePicker('disliked')}>
          <Text style={styles.selectorLabel}>Disliked roles</Text>
          <Text style={styles.selectorValue}>{roleSummary(dislikedRoleIds)}</Text>
        </Pressable>
        <Text style={styles.helper}>You can choose up to 3 roles in each list.</Text>
        <Button label={saving ? 'Saving...' : 'Save'} onPress={() => void saveProfile()} disabled={saving} />
      </SectionCard>

      <RolePreferencePickerModal
        visible={activePicker === 'favorite'}
        title="Favorite roles"
        items={roles}
        selectedIds={favoriteRoleIds}
        selectionLimit={MAX_ROLE_SELECTION}
        onToggle={(item) => toggleRoleSelection(item, 'favorite')}
        onClose={() => setActivePicker(null)}
      />
      <RolePreferencePickerModal
        visible={activePicker === 'disliked'}
        title="Disliked roles"
        items={roles}
        selectedIds={dislikedRoleIds}
        selectionLimit={MAX_ROLE_SELECTION}
        onToggle={(item) => toggleRoleSelection(item, 'disliked')}
        onClose={() => setActivePicker(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
  avatarActions: {
    gap: 12,
  },
  selectorField: {
    gap: 8,
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorLabel: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  selectorValue: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  helper: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
