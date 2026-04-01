package alafonin4.mafia.game.dto;

import alafonin4.mafia.game.domain.VoteRoundType;
import alafonin4.mafia.game.domain.VoteStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record VoteRoundResponse(
        UUID id,
        VoteRoundType type,
        int roundNumber,
        VoteStatus status,
        Instant startedAt,
        Instant completedAt,
        Long eliminatedPlayerId,
        Map<Long, Long> tally,
        List<VoteEntryResponse> entries
) {
}
