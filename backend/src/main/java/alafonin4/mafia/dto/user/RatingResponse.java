package alafonin4.mafia.dto.user;

import java.util.List;

public record RatingResponse(
        String scope,
        Integer currentUserRank,
        UserSummaryResponse currentUser,
        List<RatingEntryResponse> entries
) {
}
