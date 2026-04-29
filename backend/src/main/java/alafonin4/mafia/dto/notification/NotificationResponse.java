package alafonin4.mafia.dto.notification;

import alafonin4.mafia.entity.UserNotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
        Long id,
        UserNotificationType type,
        String title,
        String message,
        boolean read,
        boolean active,
        LocalDateTime createdAt,
        Long relatedUserId,
        String relatedUserName,
        UUID roomId,
        String roomName
) {
}
