package alafonin4.mafia.controller;

import alafonin4.mafia.dto.auth.AuthResponse;
import alafonin4.mafia.dto.auth.LoginRequest;
import alafonin4.mafia.dto.auth.LogoutRequest;
import alafonin4.mafia.dto.auth.RegisterRequest;
import alafonin4.mafia.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody Map<String, String> body) {
        return authService.refresh(body.get("refreshToken"));
    }

    @PostMapping("/logout")
    public void logout(@RequestBody(required = false) LogoutRequest request) {
        authService.logout(request != null ? request.refreshToken : null);
    }
}
