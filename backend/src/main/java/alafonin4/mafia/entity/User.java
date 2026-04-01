package alafonin4.mafia.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;
    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nickname;

    @Column
    private String avatarUrl;

    @Column(nullable = false)
    private int rating = 1000;

    @Column(nullable = false)
    private int gamesPlayed = 0;

    @Column(nullable = false)
    private int wins = 0;

    @PrePersist
    @PreUpdate
    private void normalizeFields() {
        if (nickname == null || nickname.isBlank()) {
            nickname = email == null ? "player" : email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        }
        if (rating < 0) {
            rating = 0;
        }
        if (gamesPlayed < 0) {
            gamesPlayed = 0;
        }
        if (wins < 0) {
            wins = 0;
        }
        if (avatarUrl != null && avatarUrl.isBlank()) {
            avatarUrl = null;
        }
    }
}
