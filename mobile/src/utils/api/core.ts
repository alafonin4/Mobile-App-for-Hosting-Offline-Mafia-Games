import type { AuthResponse } from './types/auth';

export type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  userId: number | null;
};

export type AuthSetter = (next: AuthResponse) => Promise<void> | void;

export type RequestOptions = {
  skipAuth?: boolean;
  retrying?: boolean;
};

export type RequestFn = <T>(path: string, init?: RequestInit, options?: RequestOptions) => Promise<T>;
