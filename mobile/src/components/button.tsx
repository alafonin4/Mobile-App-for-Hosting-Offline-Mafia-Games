import { Pressable, StyleSheet, Text } from 'react-native';

import { palette } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
};

export function Button({ label, onPress, disabled = false, tone = 'primary' }: ButtonProps) {
  const secondary = tone === 'secondary';

  return (
    <Pressable
      style={[
        styles.base,
        secondary ? styles.secondary : styles.primary,
        disabled && styles.disabled,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.label, secondary ? styles.secondaryLabel : styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: palette.blue,
  },
  secondary: {
    backgroundColor: palette.white,
    borderColor: palette.blue,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
    color: palette.white,
  },
  secondaryLabel: {
    color: palette.blue,
  },
});
