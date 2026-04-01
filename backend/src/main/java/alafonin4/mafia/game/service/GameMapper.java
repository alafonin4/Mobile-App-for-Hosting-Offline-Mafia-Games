package alafonin4.mafia.game.service;

import alafonin4.mafia.game.domain.ActionSlotDefinition;
import alafonin4.mafia.game.domain.DayRestriction;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.domain.GamePlayer;
import alafonin4.mafia.game.domain.GameRoom;
import alafonin4.mafia.game.domain.RoomRoleSlot;
import alafonin4.mafia.game.domain.TargetRule;
import alafonin4.mafia.game.domain.VoteEntry;
import alafonin4.mafia.game.domain.VoteRound;
import alafonin4.mafia.game.dto.ActionSlotResponse;
import alafonin4.mafia.game.dto.GamePlayerResponse;
import alafonin4.mafia.game.dto.GameRoomResponse;
import alafonin4.mafia.game.dto.RoleSlotResponse;
import alafonin4.mafia.game.dto.VoteEntryResponse;
import alafonin4.mafia.game.dto.VoteRoundResponse;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class GameMapper {
    public GameRoomResponse toRoomResponse(GameRoom room, Long viewerId, int requiredNightActions) {
        GamePlayer viewer = room.getPlayers().get(viewerId);
        DayRestriction viewerRestriction = viewer == null ? null : viewer.getDayRestriction();
        return new GameRoomResponse(
                room.getId(),
                room.getName(),
                room.getPhase(),
                room.getNightNumber(),
                room.getDayNumber(),
                room.getWinner(),
                room.getWinnerUserId(),
                room.getConfiguredRoles().stream().map(this::toRoleSlotResponse).toList(),
                room.getPlayers().values().stream()
                        .sorted(Comparator.comparing(GamePlayer::getUserId))
                        .map(player -> toPlayerResponse(player, viewerId, room.getPhase() == GamePhase.FINISHED))
                        .toList(),
                viewer == null ? null : viewer.getRole(),
                viewer == null ? null : viewer.getRoleVariant(),
                viewer == null ? null : viewer.getFaction(),
                viewer == null ? List.of() : viewer.getActionSlots().stream().map(this::toActionSlotResponse).toList(),
                viewerRestriction != null && viewerRestriction.isMuted(),
                viewerRestriction != null && viewerRestriction.isVoteImmune(),
                room.getPendingNightActions().size(),
                requiredNightActions,
                room.getActiveVoteRound() == null ? null : toVoteRoundResponse(room.getActiveVoteRound())
        );
    }

    public VoteRoundResponse toVoteRoundResponse(VoteRound voteRound) {
        return new VoteRoundResponse(
                voteRound.getId(),
                voteRound.getType(),
                voteRound.getRoundNumber(),
                voteRound.getStatus(),
                voteRound.getStartedAt(),
                voteRound.getCompletedAt(),
                voteRound.getEliminatedPlayerId(),
                voteRound.tally(),
                voteRound.getEntries().stream().map(this::toVoteEntryResponse).toList()
        );
    }

    private ActionSlotResponse toActionSlotResponse(ActionSlotDefinition slot) {
        return new ActionSlotResponse(
                slot.slotId(),
                slot.groupId(),
                slot.actionCode(),
                slot.targetRule() == TargetRule.REQUIRED_PLAYER,
                slot.targetRule() == TargetRule.OPTIONAL_PLAYER
        );
    }

    private GamePlayerResponse toPlayerResponse(GamePlayer player, Long viewerId, boolean revealAllRoles) {
        boolean revealRole = revealAllRoles || player.getUserId().equals(viewerId);
        DayRestriction restriction = player.getDayRestriction();
        return new GamePlayerResponse(
                player.getUserId(),
                player.getEmail(),
                player.isHost(),
                player.isReady(),
                player.getStatus(),
                revealRole ? player.getRole() : null,
                revealRole ? player.getRoleVariant() : null,
                restriction != null && restriction.isMuted(),
                restriction != null && restriction.isVoteImmune()
        );
    }

    private RoleSlotResponse toRoleSlotResponse(RoomRoleSlot slot) {
        return new RoleSlotResponse(slot.role(), slot.variant());
    }

    private VoteEntryResponse toVoteEntryResponse(VoteEntry entry) {
        return new VoteEntryResponse(entry.voterId(), entry.targetId(), entry.submittedAt());
    }
}
