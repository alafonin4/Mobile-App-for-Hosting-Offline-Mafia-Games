import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { AvatarBadge } from '@/components/avatar-badge';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { RolePreferencePickerModal } from '@/components/role-preference-picker-modal';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { useAppTheme, useThemedStyles } from '@/theme';
import { type RoleCatalogItem, type UserLanguage } from '@/utils/api';
import { LANGUAGE_OPTIONS, useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';
import { nicknameSchema, profileSchema } from '@/validation/profile';

const MAX_ROLE_SELECTION = 3;

export default function EditProfileScreen() {
  const { api } = useSession();
  const { colors } = useAppTheme();
  const { setLanguage: setAppLanguage, t } = useLocalization();
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
    avatarActions: {
      gap: 12,
    },
    selectorField: {
      gap: 8,
      backgroundColor: theme.surfaceRaised,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    selectorLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    selectorValue: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 21,
    },
    languageOptionActive: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    helper: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    nicknameStatus: {
      fontSize: 12,
      fontWeight: '600',
    },
    nicknameStatusMuted: {
      color: theme.textMuted,
    },
    nicknameStatusSuccess: {
      color: theme.success,
    },
  }));
  const [nickname, setNickname] = useState('');
  const [initialNickname, setInitialNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [favoriteRoleIds, setFavoriteRoleIds] = useState<string[]>([]);
  const [dislikedRoleIds, setDislikedRoleIds] = useState<string[]>([]);
  const [language, setLanguage] = useState<UserLanguage>('EN');
  const [roles, setRoles] = useState<RoleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePicker, setActivePicker] = useState<'favorite' | 'disliked' | null>(null);
  const [nicknameError, setNicknameError] = useState<string | undefined>();
  const [nicknameStatusMessage, setNicknameStatusMessage] = useState<string | undefined>();
  const [checkingNickname, setCheckingNickname] = useState(false);
  const nicknameCheckSequence = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const [me, mafiaRoles, townRoles] = await Promise.all([api.getMe(), api.getMafiaRoles(), api.getTownRoles()]);
        setNickname(me.nickname);
        setInitialNickname(me.nickname);
        setAvatarUrl(me.avatarUrl ?? '');
        setFavoriteRoleIds(me.favoriteRoleIds);
        setDislikedRoleIds(me.dislikedRoleIds);
        setLanguage(me.language);
        setRoles([...mafiaRoles, ...townRoles].sort((left, right) => left.name.localeCompare(right.name)));
      } catch (error) {
        Alert.alert(t('profile.loadFailed'), error instanceof Error ? error.message : t('profile.cannotLoad'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [api, t]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const trimmedNickname = nickname.trim();
    const currentNickname = initialNickname.trim();

    if (trimmedNickname.localeCompare(currentNickname, undefined, { sensitivity: 'accent' }) === 0) {
      setCheckingNickname(false);
      setNicknameError(undefined);
      setNicknameStatusMessage(t('profile.currentNickname'));
      return;
    }

    const validation = nicknameSchema.safeParse(trimmedNickname);
    if (!validation.success) {
      setCheckingNickname(false);
      setNicknameStatusMessage(undefined);
      setNicknameError(validation.error.issues[0]?.message ?? t('profile.nicknameInvalid'));
      return;
    }

    const requestId = nicknameCheckSequence.current + 1;
    nicknameCheckSequence.current = requestId;
    setCheckingNickname(true);
    setNicknameError(undefined);
    setNicknameStatusMessage(t('profile.checkingNickname'));

    const timeoutId = setTimeout(() => {
      void api.checkNicknameAvailability(trimmedNickname)
        .then((result) => {
          if (nicknameCheckSequence.current !== requestId) {
            return;
          }

          setNicknameError(result.available ? undefined : result.message);
          setNicknameStatusMessage(result.available ? t('profile.nicknameAvailable') : undefined);
        })
        .catch(() => {
          if (nicknameCheckSequence.current !== requestId) {
            return;
          }

          setNicknameError(t('profile.nicknameVerifyFailed'));
          setNicknameStatusMessage(undefined);
        })
        .finally(() => {
          if (nicknameCheckSequence.current === requestId) {
            setCheckingNickname(false);
          }
        });
    }, 350);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [api, initialNickname, loading, nickname, t]);

  async function chooseAvatarFromGallery() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('profile.permissionRequired'), t('profile.photoPermission'));
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
        Alert.alert(t('profile.imageError'), t('profile.cannotReadImage'));
        return;
      }

      setAvatarUrl(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert(t('profile.imageError'), error instanceof Error ? error.message : t('profile.cannotOpenGallery'));
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
      return t('profile.chooseRolesHint');
    }

    return roleIds.map((roleId) => roles.find((item) => item.id === roleId)?.name ?? roleId).join(', ');
  }

  async function saveProfile() {
    const parsed = profileSchema.safeParse({ nickname, avatarUrl, favoriteRoleIds, dislikedRoleIds });
    if (!parsed.success) {
      Alert.alert(t('profile.invalidProfile'), t('profile.checkForm'));
      return;
    }
    if (checkingNickname) {
      Alert.alert(t('profile.nicknameCheck'), t('profile.nicknameCheckWait'));
      return;
    }
    if (nicknameError) {
      Alert.alert(t('profile.nicknameUnavailable'), nicknameError);
      return;
    }

    try {
      setSaving(true);
      await api.updateProfile({
        nickname: parsed.data.nickname,
        avatarUrl: parsed.data.avatarUrl || null,
        favoriteRoleIds: parsed.data.favoriteRoleIds,
        dislikedRoleIds: parsed.data.dislikedRoleIds,
        language,
      });
      await setAppLanguage(language);
      router.back();
    } catch (error) {
      Alert.alert(t('profile.saveFailed'), error instanceof Error ? error.message : t('profile.cannotSave'));
    } finally {
      setSaving(false);
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
        <Text style={styles.eyebrow}>{t('profile.studioEyebrow')}</Text>
        <Text style={styles.title}>{t('profile.studioTitle')}</Text>
        <Text style={styles.copy}>{t('profile.studioCopy')}</Text>
      </SectionCard>

      <SectionCard>
        <AvatarBadge label={nickname || t('tabs.profile')} avatarUrl={avatarUrl || null} size={104} />
        <View style={styles.avatarActions}>
          <Button label={t('profile.chooseGallery')} onPress={() => void chooseAvatarFromGallery()} />
          {avatarUrl ? <Button label={t('profile.removeAvatar')} tone="secondary" onPress={() => setAvatarUrl('')} /> : null}
        </View>
        <FormField label={t('profile.nickname')} value={nickname} onChangeText={setNickname} autoCapitalize="none" error={nicknameError} />
        {nicknameStatusMessage ? (
          <Text
            style={[
              styles.nicknameStatus,
              nicknameError ? styles.nicknameStatusMuted : (checkingNickname ? styles.nicknameStatusMuted : styles.nicknameStatusSuccess),
            ]}
          >
            {nicknameStatusMessage}
          </Text>
        ) : null}
        <Pressable style={styles.selectorField} onPress={() => setActivePicker('favorite')}>
          <Text style={styles.selectorLabel}>{t('profile.favoriteRoles')}</Text>
          <Text style={styles.selectorValue}>{roleSummary(favoriteRoleIds)}</Text>
        </Pressable>
        <Pressable style={styles.selectorField} onPress={() => setActivePicker('disliked')}>
          <Text style={styles.selectorLabel}>{t('profile.dislikedRoles')}</Text>
          <Text style={styles.selectorValue}>{roleSummary(dislikedRoleIds)}</Text>
        </Pressable>
        <View style={styles.selectorField}>
          <Text style={styles.selectorLabel}>{t('profile.language')}</Text>
          <Text style={styles.helper}>{t('profile.languageHint')}</Text>
          {LANGUAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.selectorField, language === option.value && styles.languageOptionActive]}
              onPress={() => setLanguage(option.value)}
            >
              <Text style={styles.selectorValue}>{t(option.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helper}>{t('profile.roleLimitHint')}</Text>
        <Button
          label={saving ? t('profile.saving') : (checkingNickname ? t('profile.checkingNickname') : t('profile.save'))}
          onPress={() => void saveProfile()}
          disabled={saving || checkingNickname || Boolean(nicknameError)}
        />
      </SectionCard>

      <RolePreferencePickerModal
        visible={activePicker === 'favorite'}
        title={t('profile.favoriteRoles')}
        items={roles}
        selectedIds={favoriteRoleIds}
        selectionLimit={MAX_ROLE_SELECTION}
        onToggle={(item) => toggleRoleSelection(item, 'favorite')}
        onClose={() => setActivePicker(null)}
      />
      <RolePreferencePickerModal
        visible={activePicker === 'disliked'}
        title={t('profile.dislikedRoles')}
        items={roles}
        selectedIds={dislikedRoleIds}
        selectionLimit={MAX_ROLE_SELECTION}
        onToggle={(item) => toggleRoleSelection(item, 'disliked')}
        onClose={() => setActivePicker(null)}
      />
    </Screen>
  );
}
