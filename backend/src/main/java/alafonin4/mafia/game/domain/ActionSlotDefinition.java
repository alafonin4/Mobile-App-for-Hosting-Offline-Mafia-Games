package alafonin4.mafia.game.domain;

public record ActionSlotDefinition(
        String slotId,
        String groupId,
        ActionCode actionCode,
        NightResolutionPhase resolutionPhase,
        int priority,
        TargetRule targetRule
) {
}
