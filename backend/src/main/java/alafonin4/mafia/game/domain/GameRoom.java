package alafonin4.mafia.game.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class GameRoom {
    private final UUID id;
    private final String name;
    private final Long hostId;
    private final List<RoomRoleSlot> configuredRoles;
    private final Map<Long, GamePlayer> players;
    private final List<NightAction> pendingNightActions;
    private final List<VoteRound> voteHistory;
    private final List<Long> discussionQueueUserIds;
    private final List<Long> invitedUserIds;
    private GamePhase phase;
    private VoteRound activeVoteRound;
    private int nightNumber;
    private int dayNumber;
    private WinningTeam winner;
    private Long winnerUserId;

    public GameRoom(UUID id, String name, Long hostId, List<RoomRoleSlot> configuredRoles) {
        this.id = id;
        this.name = name;
        this.hostId = hostId;
        this.configuredRoles = new ArrayList<>(configuredRoles);
        this.players = new LinkedHashMap<>();
        this.pendingNightActions = new ArrayList<>();
        this.voteHistory = new ArrayList<>();
        this.discussionQueueUserIds = new ArrayList<>();
        this.invitedUserIds = new ArrayList<>();
        this.phase = GamePhase.LOBBY;
        this.winner = WinningTeam.NONE;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Long getHostId() {
        return hostId;
    }

    public List<RoomRoleSlot> getConfiguredRoles() {
        return Collections.unmodifiableList(configuredRoles);
    }

    public Map<Long, GamePlayer> getPlayers() {
        return players;
    }

    public List<NightAction> getPendingNightActions() {
        return pendingNightActions;
    }

    public List<VoteRound> getVoteHistory() {
        return Collections.unmodifiableList(voteHistory);
    }

    public List<Long> getDiscussionQueueUserIds() {
        return discussionQueueUserIds;
    }

    public List<Long> getInvitedUserIds() {
        return invitedUserIds;
    }

    public void addVoteRoundToHistory(VoteRound voteRound) {
        voteHistory.add(voteRound);
    }

    public GamePhase getPhase() {
        return phase;
    }

    public void setPhase(GamePhase phase) {
        this.phase = phase;
    }

    public VoteRound getActiveVoteRound() {
        return activeVoteRound;
    }

    public void setActiveVoteRound(VoteRound activeVoteRound) {
        this.activeVoteRound = activeVoteRound;
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
}
