import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { BreathingView, Reveal } from '@/components/motion';
import { useThemedStyles } from '@/theme';
import { loginSchema } from '@/validation/auth';
import { useLocalization } from '@/utils/localization';
import { useSession } from '@/utils/session';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const { signIn } = useSession();
  const { t } = useLocalization();
  const styles = useThemedStyles((colors) => ({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
      padding: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 30,
      borderWidth: 1,
      gap: 16,
      padding: 24,
      shadowColor: colors.overlay,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 3,
    },
    eyebrow: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 36,
      fontWeight: '800',
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    error: {
      color: colors.danger,
      fontWeight: '600',
      textAlign: 'center',
    },
    link: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
  }));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  async function handleLogin() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(t('auth.invalidForm'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signIn(parsed.data.email, parsed.data.password);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <BreathingView>
        <View style={styles.card}>
          <Reveal>
            <Text style={styles.eyebrow}>{t('auth.membersEntry')}</Text>
          </Reveal>
          <Reveal delay={40}>
            <Text style={styles.title}>{t('auth.appTitle')}</Text>
          </Reveal>
          <Reveal delay={90}>
            <Text style={styles.subtitle}>
              {t('auth.loginSubtitle')}
            </Text>
          </Reveal>
          <Reveal delay={140}>
            <FormField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </Reveal>
          <Reveal delay={190}>
            <FormField label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />
          </Reveal>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Reveal delay={240}>
            <Button label={loading ? t('auth.signingIn') : t('auth.enterClub')} onPress={() => void handleLogin()} disabled={loading} />
          </Reveal>
          <Reveal delay={280}>
            <Link href={roomId ? { pathname: '/register', params: { roomId } } : '/register'} style={styles.link}>
              {t('auth.noAccount')}
            </Link>
          </Reveal>
        </View>
      </BreathingView>
    </View>
  );
}
