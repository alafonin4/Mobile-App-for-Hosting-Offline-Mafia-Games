package alafonin4.mafia.game.dto;

import java.time.LocalDateTime;

public record VoteEntryResponse(Long voterId, Long targetId, LocalDateTime submittedAt) {
}
