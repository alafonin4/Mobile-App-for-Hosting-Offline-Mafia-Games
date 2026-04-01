import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';

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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    alignItems: 'center',
    backgroundColor: palette.softBlue,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  activeSegment: {
    backgroundColor: palette.blue,
  },
  label: {
    color: palette.blue,
    fontWeight: '700',
  },
  activeLabel: {
    color: palette.white,
  },
});
