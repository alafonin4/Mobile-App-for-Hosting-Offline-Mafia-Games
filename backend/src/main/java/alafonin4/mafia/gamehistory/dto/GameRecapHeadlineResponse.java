package alafonin4.mafia.gamehistory.dto;

import alafonin4.mafia.game.domain.WinningTeam;

import java.time.LocalDateTime;

public record GameRecapHeadlineResponse(
        String roomName,
        LocalDateTime finishedAt,
        int participantCount,
        WinningTeam winner,
        int dayNumber,
        int nightNumber
) {
}
