package alafonin4.mafia.dto.friend;

import alafonin4.mafia.entity.FriendRequestStatus;

public record FriendRequestResponse(
        Long id,
        FriendRequestStatus status,
        Long senderId,
        String senderNickname,
        String senderEmail,
        String senderAvatarUrl,
        Long receiverId,
        String receiverNickname,
        String receiverEmail,
        String receiverAvatarUrl
) {
}
