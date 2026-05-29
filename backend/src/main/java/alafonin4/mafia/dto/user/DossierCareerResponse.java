package alafonin4.mafia.dto.user;

public record DossierCareerResponse(
        int totalGames,
        int wins,
        double winRate,
        int rating,
        int hostedGames
) {
}
