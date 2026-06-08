package alafonin4.mafia.game.ws;

import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.GameRoom;
import alafonin4.mafia.game.store.GameRoomStore;
import alafonin4.mafia.repository.UserRepository;
import alafonin4.mafia.security.JwtService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@Component
public class JwtStompChannelInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final GameRoomStore roomStore;

    public JwtStompChannelInterceptor(JwtService jwtService, UserRepository userRepository, GameRoomStore roomStore) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.roomStore = roomStore;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (command == StompCommand.CONNECT) {
            User user = authenticate(accessor);
            accessor.setUser(stompPrincipal(user));
            return message;
        }

        if ((command == StompCommand.SUBSCRIBE || command == StompCommand.SEND) && accessor.getUser() == null) {
            throw new AccessDeniedException("Authenticated WebSocket session is required");
        }
        if (command == StompCommand.SUBSCRIBE) {
            ensureRoomSubscriptionAllowed(accessor);
        }

        return message;
    }

    private User authenticate(StompHeaderAccessor accessor) {
        String token = extractBearerToken(accessor);
        if (token == null) {
            throw new AccessDeniedException("Missing WebSocket authorization token");
        }
        String email = jwtService.extractEmail(token);
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AccessDeniedException("WebSocket user not found"));
    }

    private String extractBearerToken(StompHeaderAccessor accessor) {
        List<String> headers = accessor.getNativeHeader("Authorization");
        if (headers == null || headers.isEmpty()) {
            return null;
        }
        String header = headers.get(0);
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }
        return header.substring(7);
    }

    private Principal stompPrincipal(User user) {
        return () -> String.valueOf(user.getId());
    }

    private void ensureRoomSubscriptionAllowed(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith("/topic/game/")) {
            return;
        }

        Principal principal = accessor.getUser();
        if (principal == null) {
            throw new AccessDeniedException("Authenticated WebSocket session is required");
        }

        UUID roomId;
        try {
            roomId = UUID.fromString(destination.substring("/topic/game/".length()));
        } catch (IllegalArgumentException exception) {
            throw new AccessDeniedException("Invalid game subscription destination");
        }

        Long userId;
        try {
            userId = Long.valueOf(principal.getName());
        } catch (NumberFormatException exception) {
            throw new AccessDeniedException("Invalid WebSocket principal");
        }

        GameRoom room = roomStore.findById(roomId)
                .orElseThrow(() -> new AccessDeniedException("Room not found"));
        if (!room.getPlayers().containsKey(userId)) {
            throw new AccessDeniedException("Only room participants can subscribe to game events");
        }
    }
}
