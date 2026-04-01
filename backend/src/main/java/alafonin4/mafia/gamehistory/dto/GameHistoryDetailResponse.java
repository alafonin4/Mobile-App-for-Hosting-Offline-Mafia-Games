package alafonin4.mafia.gamehistory.dto;

import alafonin4.mafia.game.domain.WinningTeam;
import alafonin4.mafia.game.dto.VoteRoundResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GameHistoryDetailResponse(
        Long id,
        UUID roomId,
        String name,
        WinningTeam winner,
        Long winnerUserId,
        Instant finishedAt,
        int nightNumber,
        int dayNumber,
        List<GameHistoryPlayerResponse> players,
        List<VoteRoundResponse> voteHistory
) {
}
