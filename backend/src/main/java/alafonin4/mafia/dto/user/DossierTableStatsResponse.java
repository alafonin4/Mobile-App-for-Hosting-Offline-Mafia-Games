package alafonin4.mafia.dto.user;

public record DossierTableStatsResponse(
        double averagePlayersPerGame,
        double averageDayCount,
        double averageNightCount
) {
}
