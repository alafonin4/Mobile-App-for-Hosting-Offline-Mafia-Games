export type ClubRole = 'OWNER' | 'MEMBER';
export type ClubMembershipStatus = 'ACTIVE' | 'INVITED';

export type ClubSummary = {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  role: ClubRole;
  createdAt: string;
};

export type ClubMember = {
  userId: number;
  nickname: string;
  email: string;
  avatarUrl: string | null;
  role: ClubRole;
  status: ClubMembershipStatus;
};

export type ClubDetail = {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  role: ClubRole;
  createdAt: string;
  members: ClubMember[];
};
