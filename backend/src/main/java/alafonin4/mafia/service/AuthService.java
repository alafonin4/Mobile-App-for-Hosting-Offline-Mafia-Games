package alafonin4.mafia.service;

import alafonin4.mafia.dto.auth.AuthResponse;
import alafonin4.mafia.dto.auth.LoginRequest;
import alafonin4.mafia.dto.auth.RegisterRequest;
import alafonin4.mafia.entity.RefreshToken;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.store.GameRoomStore;
import alafonin4.mafia.repository.RefreshTokenRepository;
import alafonin4.mafia.repository.UserRepository;
import alafonin4.mafia.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 128;

    @Autowired
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final GameRoomStore roomStore;
    @Value("${security.refresh-token-ttl-days:30}")
    private long refreshTokenTtlDays;
    @Value("${security.refresh-token-game-grace-hours:12}")
    private long refreshTokenGameGraceHours;

    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email);
        String password = normalizePassword(request.password);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalStateException("Email is already registered");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname("player");

        user = userRepository.save(user);
        user.setNickname(defaultNickname(user.getId()));
        user = userRepository.save(user);
        log.info("Registered new user with email {}", user.getEmail());

        return issueTokens(user);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email);
        String password = normalizePassword(request.password);
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> {
                    log.warn("Login rejected for unknown email {}", email);
                    return new IllegalArgumentException("Invalid email or password");
                });

        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.warn("Login rejected due to wrong password for {}", email);
            throw new IllegalArgumentException("Invalid email or password");
        }

        AuthResponse response = issueTokens(user);
        log.info("User {} logged in successfully", user.getEmail());

        return response;
    }

    public AuthResponse refresh(String requestToken) {
        if (requestToken == null || requestToken.isBlank()) {
            throw new IllegalArgumentException("Invalid refresh");
        }

        RefreshToken token = refreshTokenRepository.findByTokenHash(hashToken(requestToken))
                .orElseThrow(() -> {
                    log.warn("Refresh rejected for unknown token");
                    return new IllegalArgumentException("Invalid refresh");
                });

        LocalDateTime now = LocalDateTime.now();
        if (token.getExpiryDate().isBefore(now) && !canRefreshDuringActiveGame(token, now)) {
            log.warn("Refresh rejected for expired token of user {}", token.getUser().getEmail());
            throw new IllegalArgumentException("Expired refresh");
        }

        User user = token.getUser();
        refreshTokenRepository.delete(token);
        log.info("Rotated refresh token for {}", user.getEmail());
        return issueTokens(user);
    }

    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            log.info("Logout requested without refresh token");
            return;
        }

        refreshTokenRepository.findByTokenHash(hashToken(refreshToken))
                .ifPresentOrElse(token -> {
                    log.info("User {} logged out", token.getUser().getEmail());
                    refreshTokenRepository.delete(token);
                }, () -> log.warn("Logout requested with unknown refresh token"));
    }

    private String defaultNickname(Long userId) {
        return "id" + userId;
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken();

        RefreshToken token = new RefreshToken();
        token.setTokenHash(hashToken(refreshToken));
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().plus(refreshTokenTtlDays, ChronoUnit.DAYS));

        refreshTokenRepository.save(token);

        AuthResponse response = new AuthResponse();
        response.accessToken = accessToken;
        response.refreshToken = refreshToken;
        response.userId = user.getId();
        return response;
    }

    private boolean canRefreshDuringActiveGame(RefreshToken token, LocalDateTime now) {
        if (refreshTokenGameGraceHours <= 0) {
            return false;
        }
        if (token.getExpiryDate().plus(refreshTokenGameGraceHours, ChronoUnit.HOURS).isBefore(now)) {
            return false;
        }

        Long userId = token.getUser().getId();
        boolean hasActiveGame = roomStore.findAll().values().stream()
                .anyMatch(room -> room.getPhase() != GamePhase.FINISHED && room.getPlayers().containsKey(userId));
        if (hasActiveGame) {
            log.info("Allowing expired refresh token grace for active game user {}", token.getUser().getEmail());
        }
        return hasActiveGame;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("Email is required");
        }
        String normalized = email.trim().toLowerCase();
        if (normalized.length() > 254 || !normalized.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("Invalid email");
        }
        return normalized;
    }

    private String normalizePassword(String password) {
        if (password == null) {
            throw new IllegalArgumentException("Password is required");
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Password is too short");
        }
        if (password.length() > MAX_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Password is too long");
        }
        return password;
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
