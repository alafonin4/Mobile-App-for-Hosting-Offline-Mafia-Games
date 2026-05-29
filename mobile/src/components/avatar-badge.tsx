import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { useThemedStyles } from '@/theme';

export function AvatarBadge({
  label,
  avatarUrl,
  size = 88,
}: {
  label: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const initials = label
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
  const styles = useThemedStyles((colors) => ({
    avatar: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: colors.avatarBackground,
      borderRadius: size / 2,
      height: size,
      justifyContent: 'center',
      overflow: 'hidden',
      width: size,
    },
    image: {
      height: '100%',
      width: '100%',
    },
    label: {
      color: colors.avatarText,
      fontSize: Math.max(18, Math.round(size * 0.32)),
      fontWeight: '800',
      letterSpacing: 0.4,
    },
  }));

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
