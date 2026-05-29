import type { RequestFn } from '../core';
import type {
  NicknameAvailability,
  PlayerDossier,
  RelatedUserProfile,
  UserLanguage,
  UserProfile,
  UserSearchResult,
} from '../types/users';

type UpdateProfileInput = {
  nickname: string;
  avatarUrl: string | null;
  favoriteRoleIds: string[];
  dislikedRoleIds: string[];
  language: UserLanguage;
};

export function getMe(request: RequestFn) {
  return request<UserProfile>('/users/me');
}

export function getUserProfile(request: RequestFn, userId: number) {
  return request<RelatedUserProfile>(`/users/${userId}`);
}

export function getMyDossier(request: RequestFn) {
  return request<PlayerDossier>('/users/me/dossier');
}

export function checkNicknameAvailability(request: RequestFn, nickname: string) {
  const suffix = `?nickname=${encodeURIComponent(nickname.trim())}`;
  return request<NicknameAvailability>(`/users/nickname-availability${suffix}`);
}

export function getUserDossier(request: RequestFn, userId: number) {
  return request<PlayerDossier>(`/users/${userId}/dossier`);
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
