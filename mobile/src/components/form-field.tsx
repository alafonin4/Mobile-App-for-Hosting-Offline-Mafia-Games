import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { useAppTheme, useThemedStyles } from '@/theme';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function FormField({ label, error, multiline, ...props }: FormFieldProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles((theme) => ({
    container: {
      gap: 8,
    },
    label: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    input: {
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 1,
      color: theme.text,
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    multiline: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    error: {
      color: theme.danger,
      fontSize: 12,
      fontWeight: '600',
    },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.multiline]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
