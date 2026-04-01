package alafonin4.mafia.game.service;

import alafonin4.mafia.game.dto.GameEventResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class GameEventPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    public GameEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void broadcast(UUID roomId, String type, Object payload) {
        messagingTemplate.convertAndSend("/topic/game/" + roomId, new GameEventResponse(type, payload));
    }

    public void broadcastRoomState(UUID roomId, Object payload) {
        broadcast(roomId, "ROOM_STATE_UPDATED", payload);
    }

    public void sendPrivate(Long userId, String type, Object payload) {
        messagingTemplate.convertAndSendToUser(String.valueOf(userId), "/queue/game", new GameEventResponse(type, payload));
    }

    public void sendPrivateRole(Long userId, Object payload) {
        sendPrivate(userId, "ROLE_ASSIGNED", payload);
    }

    public Object simplePayload(String message) {
        return Map.of("message", message);
    }
}
