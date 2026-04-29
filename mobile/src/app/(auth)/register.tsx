import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { palette } from '@/constants/theme';
import { registerSchema } from '@/validation/auth';
import { useSession } from '@/utils/session';

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const { signUp } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  async function handleRegister() {
    const parsed = registerSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signUp(parsed.data.email, parsed.data.password);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Mafia</Text>
        <Text style={styles.subtitle}>Register</Text>
        <FormField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <FormField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={loading ? 'Creating...' : 'Register'} onPress={() => void handleRegister()} disabled={loading} />
        <Link href={roomId ? { pathname: '/login', params: { roomId } } : '/login'} style={styles.link}>
          Already have an account? Login
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: palette.sand,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: palette.cream,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 24,
    width: '100%',
  },
  title: {
    color: palette.ink,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: palette.blue,
    fontSize: 16,
    textAlign: 'center',
  },
  error: {
    color: palette.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
  link: {
    color: palette.blue,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
