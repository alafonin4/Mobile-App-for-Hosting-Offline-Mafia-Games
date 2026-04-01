import type { RequestFn } from '../core';
import type { GameRoom, NightActionInput, RoleCatalogItem, RoleSlot } from '../types/game';

type CreateRoomInput = {
  name: string;
  roles: RoleSlot[];
};

type DayVoteInput = {
  targetUserId: number;
};

export function getMafiaRoles(request: RequestFn) {
  return request<RoleCatalogItem[]>('/game/roles/mafia');
}

export function getTownRoles(request: RequestFn) {
  return request<RoleCatalogItem[]>('/game/roles/town');
}

export function createRoom(request: RequestFn, input: CreateRoomInput) {
  return request<GameRoom>('/game/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function joinRoom(request: RequestFn, roomId: string) {
  return request<GameRoom>(`/game/rooms/${roomId}/join`, { method: 'POST' });
}

export function getRoom(request: RequestFn, roomId: string) {
  return request<GameRoom>(`/game/rooms/${roomId}`);
}

export function toggleReady(request: RequestFn, roomId: string) {
  return request<GameRoom>(`/game/rooms/${roomId}/ready`, { method: 'POST' });
}

export function startGame(request: RequestFn, roomId: string) {
  return request<GameRoom>(`/game/rooms/${roomId}/start`, { method: 'POST' });
}

export function submitNightAction(request: RequestFn, roomId: string, input: NightActionInput) {
  return request<GameRoom>(`/game/rooms/${roomId}/night-action`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function submitDayVote(request: RequestFn, roomId: string, input: DayVoteInput) {
  return request<GameRoom>(`/game/rooms/${roomId}/day-vote`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type { CreateRoomInput, DayVoteInput };
