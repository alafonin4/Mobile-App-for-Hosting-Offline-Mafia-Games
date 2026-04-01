package alafonin4.mafia.game.dto;

import java.time.Instant;

public record VoteEntryResponse(Long voterId, Long targetId, Instant submittedAt) {
}
