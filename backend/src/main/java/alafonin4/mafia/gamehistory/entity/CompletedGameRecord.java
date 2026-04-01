package alafonin4.mafia.gamehistory.entity;

import alafonin4.mafia.game.domain.WinningTeam;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "completed_games")
public class CompletedGameRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private UUID roomId;

    @Column(nullable = false)
    private String roomName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WinningTeam winner;

    @Column
    private Long winnerUserId;

    @Column(nullable = false)
    private int nightNumber;

    @Column(nullable = false)
    private int dayNumber;

    @Column(nullable = false)
    private Instant finishedAt;

    @Column(nullable = false)
    private int participantCount;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "completed_game_participants", joinColumns = @JoinColumn(name = "completed_game_id"))
    @Column(name = "participant_id", nullable = false)
    private Set<Long> participantIds = new HashSet<>();

    @Lob
    @Column(nullable = false)
    private String playersJson;

    @Lob
    @Column(nullable = false)
    private String voteHistoryJson;

    public Long getId() {
        return id;
    }

    public UUID getRoomId() {
        return roomId;
    }

    public void setRoomId(UUID roomId) {
        this.roomId = roomId;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public WinningTeam getWinner() {
        return winner;
    }

    public void setWinner(WinningTeam winner) {
        this.winner = winner;
    }

    public Long getWinnerUserId() {
        return winnerUserId;
    }

    public void setWinnerUserId(Long winnerUserId) {
        this.winnerUserId = winnerUserId;
    }

    public int getNightNumber() {
        return nightNumber;
    }

    public void setNightNumber(int nightNumber) {
        this.nightNumber = nightNumber;
    }

    public int getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(int dayNumber) {
        this.dayNumber = dayNumber;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public int getParticipantCount() {
        return participantCount;
    }

    public void setParticipantCount(int participantCount) {
        this.participantCount = participantCount;
    }

    public Set<Long> getParticipantIds() {
        return participantIds;
    }

    public void setParticipantIds(Set<Long> participantIds) {
        this.participantIds = participantIds;
    }

    public String getPlayersJson() {
        return playersJson;
    }

    public void setPlayersJson(String playersJson) {
        this.playersJson = playersJson;
    }

    public String getVoteHistoryJson() {
        return voteHistoryJson;
    }

    public void setVoteHistoryJson(String voteHistoryJson) {
        this.voteHistoryJson = voteHistoryJson;
    }
}
