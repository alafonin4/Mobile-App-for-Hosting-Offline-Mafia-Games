export type UserProfile = {
  id: number;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  favoriteRoleIds: string[];
  dislikedRoleIds: string[];
  rating: number;
  gamesPlayed: number;
  wins: number;
};

export type FriendRelation = 'SELF' | 'NONE' | 'FRIEND' | 'INCOMING_REQUEST' | 'OUTGOING_REQUEST';

export type RelatedUserProfile = UserProfile & {
  relation: FriendRelation;
  requestId: number | null;
};

export type UserSearchResult = {
  id: number;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  rating: number;
  relation: FriendRelation;
  requestId: number | null;
};
