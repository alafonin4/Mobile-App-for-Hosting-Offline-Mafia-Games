import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Redirect, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { STORAGE_KEYS } from '@/constants/config';
import { ApiClient, type AuthResponse, type SessionState } from '@/utils/api';

type SessionContextValue = {
  api: ApiClient;
  session: SessionState;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({
    accessToken: null,
    refreshToken: null,
    userId: null,
  });
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef(session);
  const apiRef = useRef<ApiClient | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  async function clearSession() {
    setSession({ accessToken: null, refreshToken: null, userId: null });
    await SecureStore.deleteItemAsync(STORAGE_KEYS.accessToken);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.userId);
  }

  async function persistAuth(auth: AuthResponse) {
    const next = {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      userId: auth.userId,
    };
    setSession(next);
    await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, auth.accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, auth.refreshToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.userId, String(auth.userId));
  }

  if (!apiRef.current) {
    apiRef.current = new ApiClient(() => sessionRef.current, persistAuth, clearSession);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const [accessToken, refreshToken, userIdRaw] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_KEYS.accessToken),
          SecureStore.getItemAsync(STORAGE_KEYS.refreshToken),
          SecureStore.getItemAsync(STORAGE_KEYS.userId),
        ]);

        if (!refreshToken) {
          setLoading(false);
          return;
        }

        const initialState = {
          accessToken,
          refreshToken,
          userId: userIdRaw ? Number(userIdRaw) : null,
        };
        setSession(initialState);
        sessionRef.current = initialState;

        const auth = await apiRef.current?.refresh(refreshToken);
        if (auth) {
          await persistAuth(auth);
        }
      } catch {
        await clearSession();
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  async function signIn(email: string, password: string) {
    const auth = await apiRef.current!.login(email, password);
    await persistAuth(auth);
  }

  async function signUp(email: string, password: string) {
    const auth = await apiRef.current!.register(email, password);
    await persistAuth(auth);
  }

  async function signOut() {
    try {
      await apiRef.current!.logout();
    } finally {
      await clearSession();
    }
  }

  return (
    <SessionContext.Provider
      value={{
        api: apiRef.current,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('Session context is unavailable');
  }
  return context;
}

export function RouteGuard() {
  const segments = useSegments();
  const { session, loading } = useSession();
  const firstSegment = segments[0];
  const inAuthGroup = firstSegment === '(auth)';

  if (loading) {
    return null;
  }

  if (!session.refreshToken && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  if (session.refreshToken && inAuthGroup) {
    return <Redirect href="/games" />;
  }

  return null;
}
