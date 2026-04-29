package alafonin4.mafia.dto.user;

import java.util.List;

public record UserRequest(
        String nickname,
        String avatarUrl,
        List<String> favoriteRoleIds,
        List<String> dislikedRoleIds
) {
}
