package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.RoleVariant;

public record RoleCatalogItemResponse(
        String id,
        PlayerRole role,
        RoleVariant variant,
        Faction faction,
        String name,
        String description,
        boolean defaultFillRole
) {
}
