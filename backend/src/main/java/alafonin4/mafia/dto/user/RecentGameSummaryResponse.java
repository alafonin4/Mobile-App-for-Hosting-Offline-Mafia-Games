package alafonin4.mafia.dto.user;

import alafonin4.mafia.game.domain.WinningTeam;

import java.time.LocalDateTime;
import java.util.UUID;

public record RecentGameSummaryResponse(
        Long gameId,
        UUID roomId,
        String roomName,
        LocalDateTime finishedAt,
        WinningTeam winner,
        boolean won,
        String roleName,
        boolean host
) {
}
