package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.ActionCode;

public record NightActionRequest(Long targetUserId, ActionCode actionCode) {
}
