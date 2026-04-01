package alafonin4.mafia.dto.auth;

import lombok.AllArgsConstructor;

@AllArgsConstructor
public class LoginRequest {
    public String email;
    public String password;
}
