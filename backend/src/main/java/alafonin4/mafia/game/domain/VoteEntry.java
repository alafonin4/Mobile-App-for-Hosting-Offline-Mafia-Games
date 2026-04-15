package alafonin4.mafia.game.domain;

import java.time.LocalDateTime;

public record VoteEntry(Long voterId, Long targetId, LocalDateTime submittedAt) {
}
