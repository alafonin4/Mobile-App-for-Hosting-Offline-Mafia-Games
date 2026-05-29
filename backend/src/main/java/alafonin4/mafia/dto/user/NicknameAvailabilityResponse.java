package alafonin4.mafia.dto.user;

public record NicknameAvailabilityResponse(
        String nickname,
        boolean available,
        String message
) {
}
