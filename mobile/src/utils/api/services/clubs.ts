import type { RequestFn } from '../core';
import type { ClubDetail, ClubSummary } from '../types/clubs';
import type { HistoryListItem } from '../types/history';

type CreateClubInput = {
  name: string;
  description: string | null;
};

export function getClubs(request: RequestFn) {
  return request<ClubSummary[]>('/clubs');
}

export function createClub(request: RequestFn, input: CreateClubInput) {
  return request<ClubDetail>('/clubs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getClub(request: RequestFn, clubId: number) {
  return request<ClubDetail>(`/clubs/${clubId}`);
}

export function inviteMemberToClub(request: RequestFn, clubId: number, userId: number) {
  return request<ClubDetail>(`/clubs/${clubId}/invite/${userId}`, {
    method: 'POST',
  });
}

export function getClubHistory(request: RequestFn, clubId: number) {
  return request<HistoryListItem[]>(`/clubs/${clubId}/history`);
}

export type { CreateClubInput };
