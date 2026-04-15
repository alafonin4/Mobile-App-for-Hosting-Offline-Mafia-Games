package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.VoteRoundType;
import alafonin4.mafia.game.domain.VoteStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record VoteRoundResponse(
        UUID id,
        VoteRoundType type,
        int roundNumber,
        VoteStatus status,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        Long eliminatedPlayerId,
        Map<Long, Long> tally,
        List<VoteEntryResponse> entries
) {
}
