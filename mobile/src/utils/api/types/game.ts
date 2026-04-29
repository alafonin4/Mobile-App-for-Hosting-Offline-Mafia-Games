export type PlayerRole =
  | 'CITIZEN'
  | 'MAFIA'
  | 'BODYGUARD'
  | 'JOURNALIST'
  | 'PROSTITUTE'
  | 'COMMISSIONER'
  | 'SHERIFF'
  | 'NINJA'
  | 'INTRIGUER'
  | 'MANIAC'
  | 'PLAGUE_DOCTOR';

export type RoleVariant =
  | 'DEFAULT'
  | 'PROSTITUTE_BLOCK_NIGHT'
  | 'PROSTITUTE_MUTE_AND_VOTE_SHIELD'
  | 'JOURNALIST_ROLE_REVEAL'
  | 'JOURNALIST_VISITOR_REPORT'
  | 'MANIAC_NEUTRAL'
  | 'MANIAC_MAFIA';

export type RoleCatalogItem = {
  id: string;
  role: PlayerRole;
  variant: RoleVariant;
  faction: 'TOWN' | 'MAFIA' | 'NEUTRAL';
  name: string;
  description: string;
  defaultFillRole: boolean;
};

export type RoleSlot = {
  role: PlayerRole;
  variant: RoleVariant;
};

export type GamePhase = 'LOBBY' | 'DAY_DISCUSSION' | 'DAY_VOTING' | 'NIGHT_ACTIONS' | 'FINISHED';

export type ActionSlot = {
  slotId: string;
  groupId: string;
  actionCode: string;
  requiredTarget: boolean;
  optionalTarget: boolean;
};

export type VoteEntry = {
  voterId: number;
  targetId: number;
  submittedAt: string;
};

export type VoteRound = {
  id: string;
  type: string;
  roundNumber: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  eliminatedPlayerId: number | null;
  tally: Record<string, number>;
  entries: VoteEntry[];
};

export type RoomPlayer = {
  userId: number;
  email: string;
  host: boolean;
  ready: boolean;
  status: string;
  visibleRole: PlayerRole | null;
  visibleVariant: RoleVariant | null;
  visibleFaction: 'TOWN' | 'MAFIA' | 'NEUTRAL' | null;
  muted: boolean;
  voteImmune: boolean;
};

export type GameRoom = {
  roomId: string;
  name: string;
  phase: GamePhase;
  nightNumber: number;
  dayNumber: number;
  winner: string;
  winnerUserId: number | null;
  configuredRoles: RoleSlot[];
  players: RoomPlayer[];
  currentUserRole: PlayerRole | null;
  currentUserVariant: RoleVariant | null;
  currentUserFaction: string | null;
  currentUserActions: ActionSlot[];
  currentUserMuted: boolean;
  currentUserVoteImmune: boolean;
  pendingNightActions: number;
  requiredNightActions: number;
  discussionQueueUserIds: number[];
  invitedUserIds: number[];
  activeVoteRound: VoteRound | null;
};

export type GameEvent = {
  type: string;
  payload: unknown;
};

export type NightActionInput = {
  targetUserId: number | null;
  actionCode: string;
};
