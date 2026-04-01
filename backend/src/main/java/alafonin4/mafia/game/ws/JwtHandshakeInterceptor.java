package alafonin4.mafia.game.ws;

import alafonin4.mafia.entity.User;
import alafonin4.mafia.repository.UserRepository;
import alafonin4.mafia.security.JwtService;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {
    private static final String AUTHORIZATION = "Authorization";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtHandshakeInterceptor(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        String token = extractToken(request);
        if (token == null) {
            return true;
        }
        try {
            String email = jwtService.extractEmail(token);
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                attributes.put("principalName", String.valueOf(user.getId()));
            }
        } catch (RuntimeException ignored) {
            // Public room events may still be consumed without a private principal.
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception) {
    }

    private String extractToken(ServerHttpRequest request) {
        List<String> headers = request.getHeaders().get(AUTHORIZATION);
        if (headers != null && !headers.isEmpty()) {
            String header = headers.get(0);
            if (header != null && header.startsWith("Bearer ")) {
                return header.substring(7);
            }
        }
        URI uri = request.getURI();
        String query = uri.getQuery();
        if (query == null || query.isBlank()) {
            return null;
        }
        for (String part : query.split("&")) {
            String[] keyValue = part.split("=", 2);
            if (keyValue.length == 2 && keyValue[0].equals("access_token")) {
                return keyValue[1];
            }
        }
        return null;
    }
}
