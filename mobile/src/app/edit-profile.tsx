import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette } from '@/constants/theme';
import { useSession } from '@/utils/session';
import { profileSchema } from '@/validation/profile';

export default function EditProfileScreen() {
  const { api } = useSession();
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const me = await api.getMe();
      setNickname(me.nickname);
      setAvatarUrl(me.avatarUrl ?? '');
    }

    void load();
  }, [api]);

  async function saveProfile() {
    const parsed = profileSchema.safeParse({ nickname, avatarUrl });
    if (!parsed.success) {
      Alert.alert('Invalid profile', parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }

    try {
      setSaving(true);
      await api.updateProfile({
        nickname: parsed.data.nickname,
        avatarUrl: parsed.data.avatarUrl || null,
      });
      router.back();
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Cannot save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <SectionCard>
        <Text style={styles.title}>Edit profile</Text>
        <FormField label="Nickname" value={nickname} onChangeText={setNickname} />
        <FormField label="Avatar URL" value={avatarUrl} onChangeText={setAvatarUrl} autoCapitalize="none" />
        <Button label={saving ? 'Saving...' : 'Save'} onPress={() => void saveProfile()} disabled={saving} />
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '700',
  },
});
