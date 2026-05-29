package alafonin4.mafia.dto.club;

import alafonin4.mafia.entity.ClubMembershipRole;
import alafonin4.mafia.entity.ClubMembershipStatus;

public record ClubMemberResponse(
        Long userId,
        String nickname,
        String email,
        String avatarUrl,
        ClubMembershipRole role,
        ClubMembershipStatus status
) {
}
