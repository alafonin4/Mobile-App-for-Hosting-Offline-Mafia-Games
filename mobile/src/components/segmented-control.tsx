import { Pressable, Text, View } from 'react-native';

import { useThemedStyles } from '@/theme';

type SegmentOption<T extends string> = {
  label: string;
  value: T;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const styles = useThemedStyles((colors) => ({
    row: {
      backgroundColor: colors.primarySoft,
      borderRadius: 999,
      flexDirection: 'row',
      gap: 6,
      padding: 6,
    },
    segment: {
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: 999,
      flex: 1,
      paddingVertical: 12,
    },
    activeSegment: {
      backgroundColor: colors.primary,
      shadowColor: colors.overlay,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 2,
    },
    label: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    activeLabel: {
      color: colors.textOnPrimary,
    },
  }));

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, active && styles.activeSegment]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
