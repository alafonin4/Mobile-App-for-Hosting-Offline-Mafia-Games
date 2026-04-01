import type { RequestFn } from '../core';
import type { FriendRequest } from '../types/friends';

export function getFriends(request: RequestFn) {
  return request<FriendRequest[]>('/friends/approved');
}

export function getIncomingRequests(request: RequestFn) {
  return request<FriendRequest[]>('/friends/received/pending');
}

export function getOutgoingRequests(request: RequestFn) {
  return request<FriendRequest[]>('/friends/sent/pending');
}

export function sendFriendRequest(request: RequestFn, receiverId: number) {
  return request<FriendRequest>('/friends/', {
    method: 'POST',
    body: JSON.stringify({ receiverId }),
  });
}

export function acceptFriendRequest(request: RequestFn, id: number) {
  return request<FriendRequest>(`/friends/accept/${id}`, { method: 'PUT' });
}

export function rejectFriendRequest(request: RequestFn, id: number) {
  return request<FriendRequest>(`/friends/reject/${id}`, { method: 'PUT' });
}
