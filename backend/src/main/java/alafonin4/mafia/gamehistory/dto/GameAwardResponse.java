package alafonin4.mafia.gamehistory.dto;

public record GameAwardResponse(
        String key,
        String title,
        Long recipientUserId,
        String recipientLabel,
        String recipientAvatarUrl,
        String metricLabel,
        String metricValue
) {
}
