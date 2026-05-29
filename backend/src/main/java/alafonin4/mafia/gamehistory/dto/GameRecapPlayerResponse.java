package alafonin4.mafia.gamehistory.dto;

public record GameRecapPlayerResponse(
        Long userId,
        String nickname,
        String avatarUrl,
        String roleName,
        boolean host
) {
}
