package alafonin4.mafia.controller;

import alafonin4.mafia.dto.notification.NotificationResponse;
import alafonin4.mafia.game.dto.GameRoomResponse;
import alafonin4.mafia.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        return ResponseEntity.ok(notificationService.getCurrentUserNotifications());
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{notificationId}/join-game")
    public ResponseEntity<GameRoomResponse> acceptGameInvite(@PathVariable Long notificationId) {
        return ResponseEntity.ok(notificationService.acceptGameInvite(notificationId));
    }
}
