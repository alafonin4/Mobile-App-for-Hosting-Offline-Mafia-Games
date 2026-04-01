import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { palette } from '@/constants/theme';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function FormField({ label, error, multiline, ...props }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={palette.muted}
        style={[styles.input, multiline && styles.multiline]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: palette.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    color: palette.ink,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '600',
  },
});
