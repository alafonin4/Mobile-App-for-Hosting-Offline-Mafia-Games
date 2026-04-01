import type { PlayerRole, RoleVariant, VoteRound } from './game';

export type HistoryListItem = {
  id: number;
  roomId: string;
  name: string;
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
  winner: string;
  winnerUserId: number | null;
  finishedAt: string;
  nightNumber: number;
  dayNumber: number;
  players: HistoryPlayer[];
  voteHistory: VoteRound[];
};
