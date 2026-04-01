import type { RequestFn } from '../core';
import type { UserProfile, UserSearchResult } from '../types/users';

type UpdateProfileInput = {
  nickname: string;
  avatarUrl: string | null;
};

export function getMe(request: RequestFn) {
  return request<UserProfile>('/users/me');
}

export function updateProfile(request: RequestFn, input: UpdateProfileInput) {
  return request<UserProfile>('/users/update', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function searchUsers(request: RequestFn, query: string) {
  const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
  return request<UserSearchResult[]>(`/users/search${suffix}`);
}

export type { UpdateProfileInput };
