package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.RoleVariant;

public record RoleSlotResponse(PlayerRole role, RoleVariant variant) {
}
