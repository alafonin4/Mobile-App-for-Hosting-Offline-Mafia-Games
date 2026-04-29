import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';

export function AvatarBadge({ label, avatarUrl }: { label: string; avatarUrl?: string | null }) {
  const initials = label
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <View style={styles.avatar}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} contentFit="cover" style={styles.image} />
      ) : (
        <Text style={styles.label}>{initials || 'M'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.softBlue,
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 88,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  label: {
    color: palette.blue,
    fontSize: 28,
    fontWeight: '800',
  },
});
