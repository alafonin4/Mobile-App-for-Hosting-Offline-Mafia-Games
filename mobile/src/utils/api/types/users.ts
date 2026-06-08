export type UserLanguage = 'EN' | 'RU' | 'JA';

export type UserProfile = {
  id: number;
  email: string | null;
  nickname: string;
  avatarUrl: string | null;
  favoriteRoleIds: string[];
  dislikedRoleIds: string[];
  language: UserLanguage;
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
  email: string | null;
  nickname: string;
  avatarUrl: string | null;
  rating: number;
  relation: FriendRelation;
  requestId: number | null;
};

export type NicknameAvailability = {
  nickname: string;
  available: boolean;
  message: string;
};

export type DossierUser = {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  relation: FriendRelation;
};

export type DossierCareer = {
  totalGames: number;
  wins: number;
  winRate: number;
  rating: number;
  hostedGames: number;
};

export type DossierForm = {
  currentStreakResult: 'W' | 'L' | 'NONE';
  currentStreakCount: number;
};

export type RoleMastery = {
  roleId: string;
  roleName: string;
  playCount: number;
  winRate: number;
};

export type DossierTableStats = {
  averagePlayersPerGame: number;
  averageDayCount: number;
  averageNightCount: number;
};

export type DossierVoting = {
  totalDayVotesCast: number;
  eliminationHitRate: number | null;
  mafiaCatchRate: number | null;
  totalVotesReceived: number;
};

export type ConnectionSummary = {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  sharedGames: number;
};

export type RecentGameSummary = {
  gameId: number;
  roomId: string;
  roomName: string;
  finishedAt: string;
  winner: string;
  won: boolean;
  roleName: string;
  host: boolean;
};

export type PlayerDossier = {
  user: DossierUser;
  career: DossierCareer;
  form: DossierForm;
  mastery: RoleMastery[];
  tableStats: DossierTableStats;
  voting: DossierVoting;
  connections: ConnectionSummary[];
  recentGames: RecentGameSummary[];
  limited: boolean;
};
