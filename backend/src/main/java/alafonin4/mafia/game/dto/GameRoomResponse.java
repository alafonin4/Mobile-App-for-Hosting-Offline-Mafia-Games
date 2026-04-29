package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.domain.WinningTeam;

import java.util.List;
import java.util.UUID;

public record GameRoomResponse(
        UUID roomId,
        String name,
        GamePhase phase,
        int nightNumber,
        int dayNumber,
        WinningTeam winner,
        Long winnerUserId,
        List<RoleSlotResponse> configuredRoles,
        List<GamePlayerResponse> players,
        PlayerRole currentUserRole,
        RoleVariant currentUserVariant,
        Faction currentUserFaction,
        List<ActionSlotResponse> currentUserActions,
        boolean currentUserMuted,
        boolean currentUserVoteImmune,
        int pendingNightActions,
        int requiredNightActions,
        List<Long> discussionQueueUserIds,
        List<Long> invitedUserIds,
        VoteRoundResponse activeVoteRound
) {
}
