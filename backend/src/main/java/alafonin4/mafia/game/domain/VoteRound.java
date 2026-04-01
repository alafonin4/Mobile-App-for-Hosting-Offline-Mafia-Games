package alafonin4.mafia.game.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class VoteRound {
    private final UUID id;
    private final VoteRoundType type;
    private final int roundNumber;
    private final Instant startedAt;
    private final Map<Long, VoteEntry> votes;
    private VoteStatus status;
    private Instant completedAt;
    private Long eliminatedPlayerId;

    public VoteRound(VoteRoundType type, int roundNumber) {
        this.id = UUID.randomUUID();
        this.type = type;
        this.roundNumber = roundNumber;
        this.startedAt = Instant.now();
        this.votes = new LinkedHashMap<>();
        this.status = VoteStatus.ACTIVE;
    }

    public UUID getId() {
        return id;
    }

    public VoteRoundType getType() {
        return type;
    }

    public int getRoundNumber() {
        return roundNumber;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public VoteStatus getStatus() {
        return status;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Long getEliminatedPlayerId() {
        return eliminatedPlayerId;
    }

    public void addVote(VoteEntry entry) {
        votes.put(entry.voterId(), entry);
    }

    public boolean hasVoteFrom(Long voterId) {
        return votes.containsKey(voterId);
    }

    public List<VoteEntry> getEntries() {
        return Collections.unmodifiableList(new ArrayList<>(votes.values()));
    }

    public Map<Long, Long> tally() {
        Map<Long, Long> tally = new LinkedHashMap<>();
        for (VoteEntry vote : votes.values()) {
            tally.merge(vote.targetId(), 1L, Long::sum);
        }
        return tally;
    }

    public void complete(Long eliminatedPlayerId) {
        this.status = VoteStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.eliminatedPlayerId = eliminatedPlayerId;
    }
}
