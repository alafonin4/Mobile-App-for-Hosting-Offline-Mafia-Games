package alafonin4.mafia.gamehistory.dto;

import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.PlayerStatus;
import alafonin4.mafia.game.domain.RoleVariant;

public record GameHistoryPlayerResponse(
        Long userId,
        String email,
        boolean host,
        PlayerStatus status,
        PlayerRole role,
        RoleVariant variant,
        Faction faction
) {
}
