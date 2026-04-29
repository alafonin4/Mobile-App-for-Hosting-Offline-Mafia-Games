package alafonin4.mafia.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

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

    @Column(columnDefinition = "TEXT")
    private String avatarUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_favorite_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role_id", nullable = false)
    @OrderColumn(name = "role_order")
    private List<String> favoriteRoleIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_disliked_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role_id", nullable = false)
    @OrderColumn(name = "role_order")
    private List<String> dislikedRoleIds = new ArrayList<>();

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
        favoriteRoleIds = normalizeRoleIds(favoriteRoleIds);
        dislikedRoleIds = normalizeRoleIds(dislikedRoleIds);
    }

    private List<String> normalizeRoleIds(List<String> roleIds) {
        if (roleIds == null) {
            return new ArrayList<>();
        }

        return roleIds.stream()
                .filter(roleId -> roleId != null && !roleId.isBlank())
                .map(String::trim)
                .collect(java.util.stream.Collectors.collectingAndThen(
                        java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                        ArrayList::new
                ));
    }
}
