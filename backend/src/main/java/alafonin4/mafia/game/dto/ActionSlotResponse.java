package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.ActionCode;

public record ActionSlotResponse(
        String slotId,
        String groupId,
        ActionCode actionCode,
        boolean targetRequired,
        boolean targetOptional
) {
}
