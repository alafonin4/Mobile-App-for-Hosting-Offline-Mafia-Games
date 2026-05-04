package alafonin4.mafia.service;

import alafonin4.mafia.dto.auth.LoginRequest;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.repository.RefreshTokenRepository;
import alafonin4.mafia.repository.UserRepository;
import alafonin4.mafia.security.JwtFilter;
import jakarta.servlet.ServletException;
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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
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

    @Test
    void logoutDeletesRefreshTokenIssuedAtLogin() {
        User user = createUser("logout@example.com", "secret123");
        String refreshToken = authService.login(new LoginRequest(user.getEmail(), "secret123")).refreshToken;

        assertTrue(refreshTokenRepository.findByToken(refreshToken).isPresent());

        authService.logout(refreshToken);

        assertFalse(refreshTokenRepository.findByToken(refreshToken).isPresent());
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

    private User createUser(String email, String password) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname("tester");
        return userRepository.save(user);
    }
}
