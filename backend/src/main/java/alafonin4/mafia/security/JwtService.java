package alafonin4.mafia.security;

import alafonin4.mafia.entity.User;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.UUID;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
@NoArgsConstructor
public class JwtService {

    private final SecretKey key = Keys.hmacShaKeyFor("super_secret_key_super_secret_key".getBytes());

    public String generateAccessToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 15))
                .signWith(key)
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
    public String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }
}