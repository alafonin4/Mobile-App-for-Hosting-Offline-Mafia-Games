package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.PlayerStatus;
import alafonin4.mafia.game.domain.RoleVariant;

public record GamePlayerResponse(
        Long userId,
        String email,
        boolean host,
        boolean ready,
        PlayerStatus status,
        PlayerRole visibleRole,
        RoleVariant visibleVariant,
        boolean muted,
        boolean voteImmune
) {
}
