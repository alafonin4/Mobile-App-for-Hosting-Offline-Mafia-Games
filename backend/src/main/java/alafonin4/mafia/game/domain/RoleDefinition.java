package alafonin4.mafia.game.domain;

import java.util.List;

public record RoleDefinition(
        PlayerRole role,
        RoleVariant variant,
        Faction faction,
        Faction investigationFaction,
        List<ActionSlotDefinition> actionSlots
) {
}
