package alafonin4.mafia.game.domain;

import java.time.LocalDateTime;

public record NightAction(
        Long actorId,
        String slotId,
        String groupId,
        ActionCode actionCode,
        Long targetId,
        NightResolutionPhase resolutionPhase,
        int priority,
        LocalDateTime submittedAt
) {
}
