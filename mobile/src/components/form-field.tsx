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
      gap: 10,
    },
    label: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 18,
      borderWidth: 1,
      color: theme.text,
      minHeight: 54,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: theme.overlay,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 1,
    },
    multiline: {
      minHeight: 104,
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
