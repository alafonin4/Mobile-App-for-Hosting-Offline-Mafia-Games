import type { UserProfile } from './users';

export type RatingScope = 'all' | 'friends';

export type RatingEntry = {
  rank: number;
  id: number;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
  currentUser: boolean;
};

export type RatingResponse = {
  scope: string;
  currentUserRank: number | null;
  currentUser: UserProfile;
  entries: RatingEntry[];
};
