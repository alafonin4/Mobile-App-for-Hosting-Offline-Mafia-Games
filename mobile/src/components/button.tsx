import { Pressable, Text } from 'react-native';

import { useThemedStyles } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
};

export function Button({ label, onPress, disabled = false, tone = 'primary' }: ButtonProps) {
  const secondary = tone === 'secondary';
  const styles = useThemedStyles((colors) => ({
    base: {
      alignItems: 'center',
      borderRadius: 18,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: 18,
      paddingVertical: 14,
      shadowColor: colors.overlay,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 2,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: 1,
    },
    disabled: {
      opacity: 0.48,
      shadowOpacity: 0,
      elevation: 0,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    primaryLabel: {
      color: colors.textOnPrimary,
    },
    secondaryLabel: {
      color: colors.text,
    },
  }));

  return (
    <Pressable
      style={[styles.base, secondary ? styles.secondary : styles.primary, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.label, secondary ? styles.secondaryLabel : styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}
