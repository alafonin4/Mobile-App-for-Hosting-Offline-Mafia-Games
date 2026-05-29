package alafonin4.mafia.dto.club;

import alafonin4.mafia.entity.ClubMembershipRole;

import java.time.LocalDateTime;

public record ClubSummaryResponse(
        Long id,
        String name,
        String description,
        int memberCount,
        ClubMembershipRole role,
        LocalDateTime createdAt
) {
}
