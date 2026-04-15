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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
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

        return login(new LoginRequest(request.email, request.password));
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.password, user.getPassword())) {
            throw new RuntimeException("Wrong password");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken();

        RefreshToken token = new RefreshToken();
        token.setToken(refreshToken);
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().plus(30, ChronoUnit.DAYS));

        refreshTokenRepository.save(token);

        AuthResponse response = new AuthResponse();
        response.accessToken = accessToken;
        response.refreshToken = refreshToken;
        response.userId = user.getId();

        return response;
    }

    public AuthResponse refresh(String requestToken) {
        RefreshToken token = refreshTokenRepository.findByToken(requestToken)
                .orElseThrow(() -> new RuntimeException("Invalid refresh"));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Expired refresh");
        }

        User user = token.getUser();

        String newAccess = jwtService.generateAccessToken(user);

        AuthResponse response = new AuthResponse();
        response.accessToken = newAccess;
        response.refreshToken = requestToken;
        response.userId = user.getId();

        return response;
    }
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken)
                .ifPresent(refreshTokenRepository::delete);
    }

    private String defaultNickname(String email) {
        int separatorIndex = email.indexOf('@');
        return separatorIndex > 0 ? email.substring(0, separatorIndex) : email;
    }
}
