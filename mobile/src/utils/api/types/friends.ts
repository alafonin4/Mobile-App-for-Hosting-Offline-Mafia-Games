export type FriendRequest = {
  id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  senderId: number;
  senderNickname: string;
  senderEmail: string;
  senderAvatarUrl: string | null;
  receiverId: number;
  receiverNickname: string;
  receiverEmail: string;
  receiverAvatarUrl: string | null;
};
