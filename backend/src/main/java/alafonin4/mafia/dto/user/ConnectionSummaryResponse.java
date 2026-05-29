package alafonin4.mafia.dto.user;

public record ConnectionSummaryResponse(
        Long userId,
        String nickname,
        String avatarUrl,
        int sharedGames
) {
}
