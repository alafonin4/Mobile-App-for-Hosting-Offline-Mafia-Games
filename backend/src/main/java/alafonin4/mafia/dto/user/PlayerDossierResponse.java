package alafonin4.mafia.dto.user;

import java.util.List;

public record PlayerDossierResponse(
        DossierUserResponse user,
        DossierCareerResponse career,
        DossierFormResponse form,
        List<RoleMasteryResponse> mastery,
        DossierTableStatsResponse tableStats,
        DossierVotingResponse voting,
        List<ConnectionSummaryResponse> connections,
        List<RecentGameSummaryResponse> recentGames,
        boolean limited
) {
}
