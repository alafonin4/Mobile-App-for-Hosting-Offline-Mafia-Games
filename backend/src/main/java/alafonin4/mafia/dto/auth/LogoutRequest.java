package alafonin4.mafia.dto.auth;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
public class LogoutRequest {
    public String refreshToken;
}
