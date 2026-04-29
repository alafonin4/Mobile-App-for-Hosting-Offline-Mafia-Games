import { buildApiUrl, resolveApiBaseUrl } from './base-url';
import type { AuthSetter, RequestFn, RequestOptions, SessionState } from './core';
import { ApiError } from './errors';
import { login, logout, refresh, register } from './services/auth';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  removeFriend,
  rejectFriendRequest,
  sendFriendRequest,
} from './services/friends';
import {
  createRoom,
  getMafiaRoles,
  getRoom,
  getTownRoles,
  inviteFriendToRoom,
  joinDiscussionQueue,
  joinRoom,
  startDayDiscussion,
  startGame,
  startNight,
  startVoting,
  submitDayVote,
  submitNightAction,
  toggleReady,
  type CreateRoomInput,
  type DayVoteInput,
} from './services/game';
import { getHistory, getHistoryDetails } from './services/history';
import {
  getNotifications,
  joinGameFromNotification,
  markAllNotificationsRead,
} from './services/notifications';
import { getRating } from './services/rating';
import { getMe, getUserProfile, searchUsers, updateProfile, type UpdateProfileInput } from './services/users';
import type { AuthResponse } from './types/auth';
import type { NightActionInput } from './types/game';
import type { RatingScope } from './types/rating';

export class ApiClient {
  private readonly getSession: () => SessionState;
  private readonly setSession: AuthSetter;
  private readonly clearSession: () => Promise<void> | void;
  private readonly apiBaseUrl: string;
  private refreshing: Promise<AuthResponse | null> | null = null;

  constructor(
    getSession: () => SessionState,
    setSession: AuthSetter,
    clearSession: () => Promise<void> | void,
    baseUrl = resolveApiBaseUrl(),
  ) {
    this.getSession = getSession;
    this.setSession = setSession;
    this.clearSession = clearSession;
    this.apiBaseUrl = baseUrl;
  }

  get baseUrl() {
    return this.apiBaseUrl;
  }

  login(email: string, password: string) {
    return login(this.request, email, password);
  }

  register(email: string, password: string) {
    return register(this.request, email, password);
  }

  refresh(refreshToken: string) {
    return refresh(this.request, refreshToken);
  }

  async logout() {
    const { refreshToken } = this.getSession();
    if (!refreshToken) {
      return;
    }

    await logout(this.request, refreshToken);
  }

  getMe() {
    return getMe(this.request);
  }

  getUserProfile(userId: number) {
    return getUserProfile(this.request, userId);
  }

  updateProfile(input: UpdateProfileInput) {
    return updateProfile(this.request, input);
  }

  searchUsers(query: string) {
    return searchUsers(this.request, query);
  }

  getRating(scope: RatingScope) {
    return getRating(this.request, scope);
  }

  getFriends() {
    return getFriends(this.request);
  }

  getIncomingRequests() {
    return getIncomingRequests(this.request);
  }

  getOutgoingRequests() {
    return getOutgoingRequests(this.request);
  }

  sendFriendRequest(receiverId: number) {
    return sendFriendRequest(this.request, receiverId);
  }

  acceptFriendRequest(id: number) {
    return acceptFriendRequest(this.request, id);
  }

  rejectFriendRequest(id: number) {
    return rejectFriendRequest(this.request, id);
  }

  cancelFriendRequest(id: number) {
    return cancelFriendRequest(this.request, id);
  }

  removeFriend(userId: number) {
    return removeFriend(this.request, userId);
  }

  getMafiaRoles() {
    return getMafiaRoles(this.request);
  }

  getTownRoles() {
    return getTownRoles(this.request);
  }

  createRoom(input: CreateRoomInput) {
    return createRoom(this.request, input);
  }

  joinRoom(roomId: string) {
    return joinRoom(this.request, roomId);
  }

  inviteFriendToRoom(roomId: string, friendId: number) {
    return inviteFriendToRoom(this.request, roomId, friendId);
  }

  getRoom(roomId: string) {
    return getRoom(this.request, roomId);
  }

  toggleReady(roomId: string) {
    return toggleReady(this.request, roomId);
  }

  startGame(roomId: string) {
    return startGame(this.request, roomId);
  }

  submitNightAction(roomId: string, input: NightActionInput) {
    return submitNightAction(this.request, roomId, input);
  }

  submitDayVote(roomId: string, input: DayVoteInput) {
    return submitDayVote(this.request, roomId, input);
  }

  startDayDiscussion(roomId: string) {
    return startDayDiscussion(this.request, roomId);
  }

  startVoting(roomId: string) {
    return startVoting(this.request, roomId);
  }

  startNight(roomId: string) {
    return startNight(this.request, roomId);
  }

  joinDiscussionQueue(roomId: string) {
    return joinDiscussionQueue(this.request, roomId);
  }

  getNotifications() {
    return getNotifications(this.request);
  }

  markAllNotificationsRead() {
    return markAllNotificationsRead(this.request);
  }

  joinGameFromNotification(notificationId: number) {
    return joinGameFromNotification(this.request, notificationId);
  }

  getHistory() {
    return getHistory(this.request);
  }

  getHistoryDetails(id: number) {
    return getHistoryDetails(this.request, id);
  }

  private request: RequestFn = async <T>(path: string, init: RequestInit = {}, options: RequestOptions = {}) => {
    const session = this.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    const requestUrl = buildApiUrl(this.apiBaseUrl, path);

    if (!options.skipAuth && session.accessToken) {
      headers.Authorization = headers.Authorization ?? `Bearer ${session.accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        ...init,
        headers,
      });
    } catch (error) {
      throw new ApiError(readNetworkErrorMessage(error, requestUrl), 0);
    }

    if (response.status === 401 && !options.skipAuth && !options.retrying && session.refreshToken) {
      const refreshed = await this.refreshSession(session.refreshToken);
      if (refreshed) {
        return this.request<T>(path, init, { ...options, retrying: true });
      }
    }

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new ApiError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  };

  private async refreshSession(refreshToken: string) {
    if (!this.refreshing) {
      this.refreshing = this.refresh(refreshToken)
        .then(async (auth) => {
          await this.setSession(auth);
          return auth;
        })
        .catch(async () => {
          await this.clearSession();
          return null;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }

    return this.refreshing;
  }
}

async function readErrorMessage(response: Response) {
  try {
    const text = await response.text();
    return text || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

function readNetworkErrorMessage(error: unknown, requestUrl: string) {
  if (error instanceof Error && error.message) {
    return `${error.message}. URL: ${requestUrl}`;
  }

  return `Network request failed. URL: ${requestUrl}`;
}
