package alafonin4.mafia.dto.user;

public record RatingEntryResponse(
        int rank,
        Long id,
        String email,
        String nickname,
        String avatarUrl,
        int rating,
        int gamesPlayed,
        int wins,
        boolean currentUser
) {
}
