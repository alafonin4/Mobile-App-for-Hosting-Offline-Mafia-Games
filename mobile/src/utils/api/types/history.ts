import type { PlayerRole, RoleVariant, VoteRound } from './game';

export type RecapAward = {
  key: string;
  title: string;
  recipientUserId: number;
  recipientLabel: string;
  recipientAvatarUrl: string | null;
  metricLabel: string;
  metricValue: string;
};

export type RecapHeadline = {
  roomName: string;
  finishedAt: string;
  participantCount: number;
  winner: string;
  dayNumber: number;
  nightNumber: number;
};

export type RecapSurvivor = {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  roleName: string;
  host: boolean;
};

export type RecapMetric = {
  label: string;
  value: string;
};

export type HistoryRecap = {
  headline: RecapHeadline;
  awards: RecapAward[];
  survivors: RecapSurvivor[];
  tableSummary: RecapMetric[];
};

export type HistoryListItem = {
  id: number;
  roomId: string;
  name: string;
  clubId: number | null;
  clubName: string | null;
  winner: string;
  winnerUserId: number | null;
  finishedAt: string;
  nightNumber: number;
  dayNumber: number;
  participantCount: number;
};

export type HistoryPlayer = {
  userId: number;
  email: string;
  host: boolean;
  status: string;
  role: PlayerRole;
  variant: RoleVariant;
  faction: string;
};

export type HistoryDetail = {
  id: number;
  roomId: string;
  name: string;
  clubId: number | null;
  clubName: string | null;
  winner: string;
  winnerUserId: number | null;
  finishedAt: string;
  nightNumber: number;
  dayNumber: number;
  recap: HistoryRecap;
  players: HistoryPlayer[];
  voteHistory: VoteRound[];
};
