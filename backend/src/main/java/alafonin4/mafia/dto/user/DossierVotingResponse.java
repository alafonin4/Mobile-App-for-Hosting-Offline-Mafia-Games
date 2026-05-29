package alafonin4.mafia.dto.user;

public record DossierVotingResponse(
        int totalDayVotesCast,
        Double eliminationHitRate,
        Double mafiaCatchRate,
        int totalVotesReceived
) {
}
