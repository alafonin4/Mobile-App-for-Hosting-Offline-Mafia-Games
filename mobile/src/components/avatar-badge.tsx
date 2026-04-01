import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';

export function AvatarBadge({ label }: { label: string }) {
  const initials = label
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <View style={styles.avatar}>
      <Text style={styles.label}>{initials || 'M'}</Text>
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
    width: 88,
  },
  label: {
    color: palette.blue,
    fontSize: 28,
    fontWeight: '800',
  },
});
