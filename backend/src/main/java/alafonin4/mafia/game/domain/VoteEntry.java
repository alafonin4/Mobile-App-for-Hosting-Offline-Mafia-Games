package alafonin4.mafia.game.domain;

import java.time.Instant;

public record VoteEntry(Long voterId, Long targetId, Instant submittedAt) {
}
