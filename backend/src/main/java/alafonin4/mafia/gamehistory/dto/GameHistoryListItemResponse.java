package alafonin4.mafia.gamehistory.dto;

import alafonin4.mafia.game.domain.WinningTeam;

import java.time.LocalDateTime;
import java.util.UUID;

public record GameHistoryListItemResponse(
        Long id,
        UUID roomId,
        String name,
        WinningTeam winner,
        Long winnerUserId,
        LocalDateTime finishedAt,
        int nightNumber,
        int dayNumber,
        int participantCount
) {
}
