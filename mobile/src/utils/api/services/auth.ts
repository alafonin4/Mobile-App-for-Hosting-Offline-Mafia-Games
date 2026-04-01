import type { RequestFn } from '../core';
import type { AuthResponse } from '../types/auth';

export function login(request: RequestFn, email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(request: RequestFn, email: string, password: string) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function refresh(request: RequestFn, refreshToken: string) {
  return request<AuthResponse>(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    },
    { skipAuth: true },
  );
}

export function logout(request: RequestFn, refreshToken: string) {
  return request<void>(
    '/auth/logout',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
    { skipAuth: true },
  );
}
