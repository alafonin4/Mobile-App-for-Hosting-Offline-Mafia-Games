package alafonin4.mafia.service;

import alafonin4.mafia.dto.auth.LoginRequest;
import alafonin4.mafia.dto.auth.RegisterRequest;
import alafonin4.mafia.dto.auth.AuthResponse;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.domain.GamePlayer;
import alafonin4.mafia.game.domain.GameRoom;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.domain.RoomRoleSlot;
import alafonin4.mafia.game.store.GameRoomStore;
import alafonin4.mafia.entity.RefreshToken;
import alafonin4.mafia.repository.RefreshTokenRepository;
import alafonin4.mafia.repository.UserRepository;
import alafonin4.mafia.security.JwtFilter;
import jakarta.servlet.ServletException;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtFilter jwtFilter;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private GameRoomStore roomStore;

    @Test
    void logoutDeletesRefreshTokenIssuedAtLogin() {
        User user = createUser("logout@example.com", "secret123");
        String refreshToken = authService.login(new LoginRequest(user.getEmail(), "secret123")).refreshToken;

        assertEquals(1, refreshTokenRepository.count());
        assertFalse(refreshTokenRepository.findAll().get(0).getTokenHash().equals(refreshToken));

        authService.logout(refreshToken);

        assertEquals(0, refreshTokenRepository.count());
    }

    @Test
    void refreshRotatesStoredRefreshToken() {
        User user = createUser("refresh-rotation@example.com", "secret123");
        String refreshToken = authService.login(new LoginRequest(user.getEmail(), "secret123")).refreshToken;

        AuthResponse rotated = authService.refresh(refreshToken);

        assertFalse(refreshToken.equals(rotated.refreshToken));
        assertEquals(1, refreshTokenRepository.count());
    }

    @Test
    void expiredRefreshIsRejectedWithoutActiveGame() {
        User user = createUser("expired-refresh@example.com", "secret123");
        String refreshToken = authService.login(new LoginRequest(user.getEmail(), "secret123")).refreshToken;
        expireStoredRefreshToken();

        assertThrows(IllegalArgumentException.class, () -> authService.refresh(refreshToken));
    }

    @Test
    void expiredRefreshRotatesWhenUserIsInActiveGame() {
        User user = createUser("active-game-refresh@example.com", "secret123");
        String refreshToken = authService.login(new LoginRequest(user.getEmail(), "secret123")).refreshToken;
        expireStoredRefreshToken();
        saveActiveRoomFor(user);

        AuthResponse rotated = authService.refresh(refreshToken);

        assertFalse(refreshToken.equals(rotated.refreshToken));
        assertEquals(user.getId(), rotated.userId);
        assertEquals(1, refreshTokenRepository.count());
    }

    @Test
    void jwtFilterIgnoresMalformedBearerToken() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer not-a-jwt");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        SecurityContextHolder.clearContext();
        jwtFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void registerAssignsIdBasedNickname() {
        AuthResponse response = authService.register(new RegisterRequest("register@example.com", "secret123"));
        entityManager.flush();
        entityManager.clear();

        User registeredUser = userRepository.findById(response.userId).orElseThrow();

        assertEquals("id" + registeredUser.getId(), registeredUser.getNickname());
    }

    private User createUser(String email, String password) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname("tester");
        return userRepository.save(user);
    }

    private void expireStoredRefreshToken() {
        RefreshToken token = refreshTokenRepository.findAll().get(0);
        token.setExpiryDate(LocalDateTime.now().minusMinutes(1));
        refreshTokenRepository.save(token);
    }

    private void saveActiveRoomFor(User user) {
        GameRoom room = new GameRoom(
                UUID.randomUUID(),
                "active",
                user.getId(),
                null,
                null,
                List.of(new RoomRoleSlot(PlayerRole.CITIZEN, RoleVariant.DEFAULT))
        );
        room.getPlayers().put(user.getId(), new GamePlayer(user.getId(), user.getEmail(), false));
        room.setPhase(GamePhase.DAY_DISCUSSION);
        roomStore.save(room);
    }
}
