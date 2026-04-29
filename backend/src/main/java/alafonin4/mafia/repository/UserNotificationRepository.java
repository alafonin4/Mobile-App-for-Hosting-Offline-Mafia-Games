package alafonin4.mafia.repository;

import alafonin4.mafia.entity.UserNotification;
import alafonin4.mafia.entity.UserNotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {
    List<UserNotification> findAllByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    @Modifying
    @Query("""
            update UserNotification notification
            set notification.read = true
            where notification.recipient.id = :recipientId
            """)
    void markAllReadForRecipient(@Param("recipientId") Long recipientId);

    @Modifying
    @Query("""
            update UserNotification notification
            set notification.active = false
            where notification.type = :type
              and notification.roomId = :roomId
              and notification.active = true
            """)
    void deactivateActiveRoomNotifications(@Param("type") UserNotificationType type, @Param("roomId") UUID roomId);
}
