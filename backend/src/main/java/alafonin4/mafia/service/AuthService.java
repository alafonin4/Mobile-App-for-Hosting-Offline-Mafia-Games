package alafonin4.mafia.service;

import alafonin4.mafia.dto.auth.AuthResponse;
import alafonin4.mafia.dto.auth.LoginRequest;
import alafonin4.mafia.dto.auth.RegisterRequest;
import alafonin4.mafia.entity.RefreshToken;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.repository.RefreshTokenRepository;
import alafonin4.mafia.repository.UserRepository;
import alafonin4.mafia.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    @Autowired
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {
        User user = new User();
        user.setEmail(request.email);
        user.setPassword(passwordEncoder.encode(request.password));
        user.setNickname(defaultNickname(request.email));

        userRepository.save(user);
        log.info("Registered new user with email {}", user.getEmail());

        return login(new LoginRequest(request.email, request.password));
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email)
                .orElseThrow(() -> {
                    log.warn("Login rejected for unknown email {}", request.email);
                    return new IllegalArgumentException("User not found");
                });

        if (!passwordEncoder.matches(request.password, user.getPassword())) {
            log.warn("Login rejected due to wrong password for {}", request.email);
            throw new IllegalArgumentException("Wrong password");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken();

        RefreshToken token = new RefreshToken();
        token.setToken(refreshToken);
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().plus(30, ChronoUnit.DAYS));

        refreshTokenRepository.save(token);
        log.info("User {} logged in successfully", user.getEmail());

        AuthResponse response = new AuthResponse();
        response.accessToken = accessToken;
        response.refreshToken = refreshToken;
        response.userId = user.getId();

        return response;
    }

    public AuthResponse refresh(String requestToken) {
        RefreshToken token = refreshTokenRepository.findByToken(requestToken)
                .orElseThrow(() -> {
                    log.warn("Refresh rejected for unknown token");
                    return new IllegalArgumentException("Invalid refresh");
                });

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            log.warn("Refresh rejected for expired token of user {}", token.getUser().getEmail());
            throw new IllegalArgumentException("Expired refresh");
        }

        User user = token.getUser();

        String newAccess = jwtService.generateAccessToken(user);
        log.info("Issued fresh access token for {}", user.getEmail());

        AuthResponse response = new AuthResponse();
        response.accessToken = newAccess;
        response.refreshToken = requestToken;
        response.userId = user.getId();

        return response;
    }
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            log.info("Logout requested without refresh token");
            return;
        }

        refreshTokenRepository.findByToken(refreshToken)
                .ifPresentOrElse(token -> {
                    log.info("User {} logged out", token.getUser().getEmail());
                    refreshTokenRepository.delete(token);
                }, () -> log.warn("Logout requested with unknown refresh token"));
    }

    private String defaultNickname(String email) {
        int separatorIndex = email.indexOf('@');
        return separatorIndex > 0 ? email.substring(0, separatorIndex) : email;
    }
}
