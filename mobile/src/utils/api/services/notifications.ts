import type { RequestFn } from '../core';
import type { ClubDetail } from '../types/clubs';
import type { GameRoom } from '../types/game';
import type { AppNotification } from '../types/notifications';

export function getNotifications(request: RequestFn) {
  return request<AppNotification[]>('/notifications');
}

export function markAllNotificationsRead(request: RequestFn) {
  return request<void>('/notifications/read-all', { method: 'PUT' });
}

export function joinGameFromNotification(request: RequestFn, notificationId: number) {
  return request<GameRoom>(`/notifications/${notificationId}/join-game`, { method: 'POST' });
}

export function joinClubFromNotification(request: RequestFn, notificationId: number) {
  return request<ClubDetail>(`/notifications/${notificationId}/join-club`, { method: 'POST' });
}
