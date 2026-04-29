package alafonin4.mafia.dto.user;

import java.util.List;

public record UserResponse(
        Long id,
        String email,
        String nickname,
        String avatarUrl,
        List<String> favoriteRoleIds,
        List<String> dislikedRoleIds,
        int rating,
        int gamesPlayed,
        int wins
) {
}
