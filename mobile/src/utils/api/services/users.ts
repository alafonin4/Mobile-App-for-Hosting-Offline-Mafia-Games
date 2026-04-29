import type { RequestFn } from '../core';
import type { RelatedUserProfile, UserProfile, UserSearchResult } from '../types/users';

type UpdateProfileInput = {
  nickname: string;
  avatarUrl: string | null;
  favoriteRoleIds: string[];
  dislikedRoleIds: string[];
};

export function getMe(request: RequestFn) {
  return request<UserProfile>('/users/me');
}

export function getUserProfile(request: RequestFn, userId: number) {
  return request<RelatedUserProfile>(`/users/${userId}`);
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
