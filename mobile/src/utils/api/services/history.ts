import type { RequestFn } from '../core';
import type { HistoryDetail, HistoryListItem } from '../types/history';

export function getHistory(request: RequestFn) {
  return request<HistoryListItem[]>('/games/history');
}

export function getHistoryDetails(request: RequestFn, id: number) {
  return request<HistoryDetail>(`/games/history/${id}`);
}

export function getHistoryDetailsByRoomId(request: RequestFn, roomId: string) {
  return request<HistoryDetail>(`/games/history/room/${roomId}`);
}
