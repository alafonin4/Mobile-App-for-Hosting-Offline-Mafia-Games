export type NotificationType =
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'GAME_INVITE';

export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  active: boolean;
  createdAt: string;
  relatedUserId: number | null;
  relatedUserName: string | null;
  roomId: string | null;
  roomName: string | null;
};
