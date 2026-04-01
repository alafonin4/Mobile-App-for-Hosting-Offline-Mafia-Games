package alafonin4.mafia.game.domain;

import java.util.Collections;
import java.util.List;

public class GamePlayer {
    private final Long userId;
    private final String email;
    private boolean host;
    private boolean ready;
    private PlayerStatus status;
    private PlayerRole role;
    private RoleVariant roleVariant;
    private Faction faction;
    private Faction investigationFaction;
    private List<ActionSlotDefinition> actionSlots;
    private DayRestriction dayRestriction;

    public GamePlayer(Long userId, String email, boolean host) {
        this.userId = userId;
        this.email = email;
        this.host = host;
        this.ready = false;
        this.status = PlayerStatus.ALIVE;
        this.actionSlots = List.of();
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public boolean isHost() {
        return host;
    }

    public void setHost(boolean host) {
        this.host = host;
    }

    public boolean isReady() {
        return ready;
    }

    public void setReady(boolean ready) {
        this.ready = ready;
    }

    public PlayerStatus getStatus() {
        return status;
    }

    public boolean isAlive() {
        return status == PlayerStatus.ALIVE;
    }

    public void eliminate() {
        this.status = PlayerStatus.ELIMINATED;
    }

    public PlayerRole getRole() {
        return role;
    }

    public RoleVariant getRoleVariant() {
        return roleVariant;
    }

    public Faction getFaction() {
        return faction;
    }

    public Faction getInvestigationFaction() {
        return investigationFaction;
    }

    public List<ActionSlotDefinition> getActionSlots() {
        return Collections.unmodifiableList(actionSlots);
    }

    public void assignRole(RoleDefinition definition) {
        this.role = definition.role();
        this.roleVariant = definition.variant();
        this.faction = definition.faction();
        this.investigationFaction = definition.investigationFaction();
        this.actionSlots = List.copyOf(definition.actionSlots());
    }

    public DayRestriction getDayRestriction() {
        return dayRestriction;
    }

    public void setDayRestriction(DayRestriction dayRestriction) {
        this.dayRestriction = dayRestriction;
    }

    public void clearDayRestriction() {
        this.dayRestriction = null;
    }
}
