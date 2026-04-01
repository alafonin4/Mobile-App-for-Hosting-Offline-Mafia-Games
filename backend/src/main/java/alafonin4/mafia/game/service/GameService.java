package alafonin4.mafia.game.service;

import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.ActionCode;
import alafonin4.mafia.game.domain.ActionSlotDefinition;
import alafonin4.mafia.game.domain.DayRestriction;
import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.domain.GamePlayer;
import alafonin4.mafia.game.domain.GameRoom;
import alafonin4.mafia.game.domain.NightAction;
import alafonin4.mafia.game.domain.NightResolutionPhase;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.PlayerStatus;
import alafonin4.mafia.game.domain.RoleDefinition;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.domain.RoomRoleSlot;
import alafonin4.mafia.game.domain.TargetRule;
import alafonin4.mafia.game.domain.VoteEntry;
import alafonin4.mafia.game.domain.VoteRound;
import alafonin4.mafia.game.domain.VoteRoundType;
import alafonin4.mafia.game.domain.WinningTeam;
import alafonin4.mafia.game.dto.CreateRoomRequest;
import alafonin4.mafia.game.dto.DayVoteRequest;
import alafonin4.mafia.game.dto.GameRoomResponse;
import alafonin4.mafia.game.dto.NightActionRequest;
import alafonin4.mafia.game.dto.RoleSlotRequest;
import alafonin4.mafia.game.dto.VoteRoundResponse;
import alafonin4.mafia.game.store.GameRoomStore;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class GameService {
    private final GameRoomStore roomStore;
    private final RoleCatalog roleCatalog;
    private final GameMapper gameMapper;
    private final GameEventPublisher eventPublisher;

    public GameService(GameRoomStore roomStore, RoleCatalog roleCatalog, GameMapper gameMapper, GameEventPublisher eventPublisher) {
        this.roomStore = roomStore;
        this.roleCatalog = roleCatalog;
        this.gameMapper = gameMapper;
        this.eventPublisher = eventPublisher;
    }

    private record KillAttempt(Long targetId, Long actorId, ActionCode actionCode) {
    }

    private record PrivateNightMessage(Long userId, String type, Object payload) {
    }

    public GameRoomResponse createRoom(CreateRoomRequest request) {
        User currentUser = currentUser();
        List<RoomRoleSlot> configuredRoles = normalizeRoles(request.roles());
        GameRoom room = new GameRoom(
                UUID.randomUUID(),
                request.name() == null || request.name().isBlank() ? "Mafia room" : request.name().trim(),
                currentUser.getId(),
                configuredRoles
        );
        room.getPlayers().put(currentUser.getId(), new GamePlayer(currentUser.getId(), currentUser.getEmail(), true));
        roomStore.save(room);
        return broadcastRoomState(room, currentUser.getId());
    }

    public GameRoomResponse joinRoom(UUID roomId) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            requirePhase(room, GamePhase.LOBBY);
            if (room.getPlayers().containsKey(currentUser.getId())) {
                return gameMapper.toRoomResponse(room, currentUser.getId(), requiredNightActionCount(room));
            }
            if (room.getPlayers().size() >= room.getConfiguredRoles().size()) {
                throw new IllegalStateException("Room is already full");
            }
            room.getPlayers().put(currentUser.getId(), new GamePlayer(currentUser.getId(), currentUser.getEmail(), false));
            return broadcastRoomState(room, currentUser.getId());
        }
    }

    public GameRoomResponse leaveRoom(UUID roomId) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            requirePhase(room, GamePhase.LOBBY);
            if (!room.getPlayers().containsKey(currentUser.getId())) {
                throw new IllegalStateException("User is not in the room");
            }
            if (currentUser.getId().equals(room.getHostId())) {
                roomStore.delete(roomId);
                eventPublisher.broadcast(roomId, "ROOM_CLOSED", eventPublisher.simplePayload("Host closed the room"));
                return new GameRoomResponse(roomId, room.getName(), room.getPhase(), room.getNightNumber(), room.getDayNumber(),
                        room.getWinner(), room.getWinnerUserId(), List.of(), List.of(), null, null, null, List.of(), false, false, 0, 0, null);
            }
            room.getPlayers().remove(currentUser.getId());
            return broadcastRoomState(room, currentUser.getId());
        }
    }

    public GameRoomResponse toggleReady(UUID roomId) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            requirePhase(room, GamePhase.LOBBY);
            GamePlayer player = getPlayer(room, currentUser.getId());
            player.setReady(!player.isReady());
            return broadcastRoomState(room, currentUser.getId());
        }
    }

    public GameRoomResponse startGame(UUID roomId) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            requirePhase(room, GamePhase.LOBBY);
            if (!currentUser.getId().equals(room.getHostId())) {
                throw new IllegalStateException("Only the host can start the game");
            }
            if (room.getPlayers().size() < 4) {
                throw new IllegalStateException("At least 4 players are required");
            }
            if (room.getPlayers().size() != room.getConfiguredRoles().size()) {
                throw new IllegalStateException("The number of players must match configured roles");
            }
            if (room.getPlayers().values().stream().anyMatch(player -> !player.isReady())) {
                throw new IllegalStateException("All players must be ready");
            }

            assignRoles(room);
            room.setPhase(GamePhase.NIGHT_ACTIONS);
            room.setNightNumber(1);
            room.setDayNumber(0);
            room.getPendingNightActions().clear();
            room.setActiveVoteRound(null);
            room.setWinner(WinningTeam.NONE);
            room.setWinnerUserId(null);
            room.getPlayers().values().forEach(GamePlayer::clearDayRestriction);

            for (GamePlayer player : room.getPlayers().values()) {
                eventPublisher.sendPrivateRole(player.getUserId(), Map.of(
                        "roomId", room.getId(),
                        "role", player.getRole(),
                        "variant", player.getRoleVariant(),
                        "faction", player.getFaction(),
                        "actions", player.getActionSlots().stream().map(ActionSlotDefinition::actionCode).toList()
                ));
            }

            GameRoomResponse response = broadcastRoomState(room, currentUser.getId());
            if (requiredNightActionCount(room) == 0) {
                resolveNight(room, currentUser.getId());
                response = gameMapper.toRoomResponse(room, currentUser.getId(), requiredNightActionCount(room));
            }
            return response;
        }
    }

    public GameRoomResponse submitNightAction(UUID roomId, NightActionRequest request) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            requirePhase(room, GamePhase.NIGHT_ACTIONS);
            GamePlayer actor = getAlivePlayer(room, currentUser.getId());
            ActionSlotDefinition slot = findActionSlot(actor, request.actionCode());
            ensureGroupIsFree(room, actor.getUserId(), slot.groupId());

            Long targetId = validateNightTarget(room, slot, request.targetUserId());
            room.getPendingNightActions().add(new NightAction(
                    actor.getUserId(),
                    slot.slotId(),
                    slot.groupId(),
                    slot.actionCode(),
                    targetId,
                    slot.resolutionPhase(),
                    slot.priority(),
                    Instant.now()
            ));

            if (room.getPendingNightActions().size() >= requiredNightActionCount(room)) {
                resolveNight(room, currentUser.getId());
            }
            return broadcastRoomState(room, currentUser.getId());
        }
    }

    public GameRoomResponse submitDayVote(UUID roomId, DayVoteRequest request) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            requirePhase(room, GamePhase.DAY_VOTING);
            GamePlayer voter = getAlivePlayer(room, currentUser.getId());
            if (voter.getDayRestriction() != null && voter.getDayRestriction().isMuted()) {
                throw new IllegalStateException("Muted players cannot vote");
            }
            GamePlayer target = getAlivePlayer(room, request.targetUserId());
            if (target.getDayRestriction() != null && target.getDayRestriction().isVoteImmune()) {
                throw new IllegalStateException("This player cannot be voted against this day");
            }
            VoteRound voteRound = room.getActiveVoteRound();
            if (voteRound == null) {
                throw new IllegalStateException("Vote round is not active");
            }
            if (voteRound.hasVoteFrom(voter.getUserId())) {
                throw new IllegalStateException("Player has already voted in this round");
            }

            voteRound.addVote(new VoteEntry(voter.getUserId(), target.getUserId(), Instant.now()));
            if (voteRound.getEntries().size() >= eligibleDayVoters(room).size()) {
                resolveDayVote(room, currentUser.getId());
            }
            return broadcastRoomState(room, currentUser.getId());
        }
    }

    public GameRoomResponse getRoomState(UUID roomId) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            ensureParticipant(room, currentUser.getId());
            return gameMapper.toRoomResponse(room, currentUser.getId(), requiredNightActionCount(room));
        }
    }

    public List<VoteRoundResponse> getVoteHistory(UUID roomId) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            ensureParticipant(room, currentUser.getId());
            return room.getVoteHistory().stream().map(gameMapper::toVoteRoundResponse).toList();
        }
    }

    public VoteRoundResponse getVoteRound(UUID roomId, UUID roundId) {
        User currentUser = currentUser();
        GameRoom room = getRoom(roomId);
        synchronized (room) {
            ensureParticipant(room, currentUser.getId());
            VoteRound round = room.getVoteHistory().stream()
                    .filter(voteRound -> voteRound.getId().equals(roundId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Vote round not found"));
            return gameMapper.toVoteRoundResponse(round);
        }
    }

    private List<RoomRoleSlot> normalizeRoles(List<RoleSlotRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("At least one role must be configured");
        }
        List<RoomRoleSlot> slots = new ArrayList<>();
        for (RoleSlotRequest request : requests) {
            if (request == null || request.role() == null) {
                throw new IllegalArgumentException("Role slots must contain a role");
            }
            RoleVariant normalizedVariant = roleCatalog.normalizeVariant(request.role(), request.variant());
            RoomRoleSlot slot = new RoomRoleSlot(request.role(), normalizedVariant);
            roleCatalog.validateSlot(slot);
            slots.add(slot);
        }
        return slots;
    }

    private void assignRoles(GameRoom room) {
        List<GamePlayer> players = new ArrayList<>(room.getPlayers().values());
        List<RoomRoleSlot> slots = new ArrayList<>(room.getConfiguredRoles());
        shuffle(slots);
        for (int index = 0; index < players.size(); index++) {
            RoleDefinition definition = roleCatalog.definitionFor(slots.get(index));
            GamePlayer player = players.get(index);
            player.assignRole(definition);
            player.setReady(false);
        }
    }

    private void shuffle(List<RoomRoleSlot> slots) {
        for (int index = slots.size() - 1; index > 0; index--) {
            int otherIndex = ThreadLocalRandom.current().nextInt(index + 1);
            RoomRoleSlot current = slots.get(index);
            slots.set(index, slots.get(otherIndex));
            slots.set(otherIndex, current);
        }
    }

    private void resolveNight(GameRoom room, Long viewerId) {
        List<NightAction> actions = room.getPendingNightActions().stream()
                .sorted(Comparator.comparing(NightAction::resolutionPhase)
                        .thenComparing(NightAction::priority)
                        .thenComparing(NightAction::submittedAt))
                .toList();

        Map<Long, List<PlayerRole>> visitorsByTarget = collectVisitors(room, actions);
        Set<Long> absoluteProtectedTargets = new HashSet<>();
        Set<Long> blockedActors = new HashSet<>();
        Map<Long, Faction> investigationOverrides = new HashMap<>();
        Map<Long, DayRestriction> nextDayRestrictions = new HashMap<>();
        Set<Long> plagueDoctorTargets = new HashSet<>();
        Map<Long, Long> mafiaVotes = new LinkedHashMap<>();
        List<KillAttempt> directKillAttempts = new ArrayList<>();
        List<PrivateNightMessage> privateMessages = new ArrayList<>();

        for (NightAction action : actionsForPhase(actions, NightResolutionPhase.ABSOLUTE_PROTECTION)) {
            if (action.targetId() != null && !blockedActors.contains(action.actorId())) {
                absoluteProtectedTargets.add(action.targetId());
            }
        }

        for (NightAction action : actionsForPhase(actions, NightResolutionPhase.BLOCK)) {
            if (canApplyTargetedAction(action, blockedActors, absoluteProtectedTargets)) {
                blockedActors.add(action.targetId());
            }
        }

        for (NightAction action : actionsForPhase(actions, NightResolutionPhase.KILL_SETUP)) {
            if (!canApplyActorAction(action, blockedActors)) {
                continue;
            }
            if (action.actionCode() == ActionCode.MAFIA_KILL) {
                if (!isProtectedTarget(action.targetId(), absoluteProtectedTargets)) {
                    mafiaVotes.merge(action.targetId(), 1L, Long::sum);
                }
            } else if (action.actionCode() == ActionCode.ROLE_KILL && action.targetId() != null
                    && !isProtectedTarget(action.targetId(), absoluteProtectedTargets)) {
                directKillAttempts.add(new KillAttempt(action.targetId(), action.actorId(), action.actionCode()));
            }
        }

        for (NightAction action : actionsForPhase(actions, NightResolutionPhase.INVESTIGATION_OVERRIDE)) {
            if (canApplyTargetedAction(action, blockedActors, absoluteProtectedTargets)) {
                investigationOverrides.put(action.targetId(), Faction.MAFIA);
            }
        }

        for (NightAction action : actionsForPhase(actions, NightResolutionPhase.POST_PROCESS)) {
            if (!canApplyActorAction(action, blockedActors)) {
                continue;
            }
            if (action.actionCode() == ActionCode.PROSTITUTE_MUTE_SHIELD
                    && !isProtectedTarget(action.targetId(), absoluteProtectedTargets)) {
                nextDayRestrictions.put(action.targetId(), new DayRestriction(true, true));
            }
            if (action.actionCode() == ActionCode.PLAGUE_DOCTOR_MARK
                    && !isProtectedTarget(action.targetId(), absoluteProtectedTargets)) {
                plagueDoctorTargets.add(action.targetId());
            }
        }

        Set<Long> killTargets = new HashSet<>();
        Long mafiaVictim = resolveNightVictim(mafiaVotes);
        if (mafiaVictim != null) {
            killTargets.add(mafiaVictim);
        }
        directKillAttempts.stream().map(KillAttempt::targetId).forEach(killTargets::add);

        for (Long plagueTarget : plagueDoctorTargets) {
            if (killTargets.contains(plagueTarget)) {
                killTargets.remove(plagueTarget);
            } else {
                killTargets.add(plagueTarget);
            }
        }

        for (Long targetId : killTargets) {
            GamePlayer target = room.getPlayers().get(targetId);
            if (target != null && target.isAlive()) {
                target.eliminate();
            }
        }

        for (NightAction action : actionsForPhase(actions, NightResolutionPhase.INVESTIGATION)) {
            if (canApplyTargetedAction(action, blockedActors, absoluteProtectedTargets)) {
                GamePlayer target = room.getPlayers().get(action.targetId());
                Faction visibleFaction = effectiveInvestigationFaction(target, investigationOverrides);
                privateMessages.add(new PrivateNightMessage(action.actorId(), "INVESTIGATION_RESULT", Map.of(
                        "targetUserId", target.getUserId(),
                        "faction", visibleFaction
                )));
            }
        }

        for (NightAction action : actionsForPhase(actions, NightResolutionPhase.INFORMATION)) {
            if (!canApplyTargetedAction(action, blockedActors, absoluteProtectedTargets)) {
                continue;
            }
            GamePlayer target = room.getPlayers().get(action.targetId());
            if (action.actionCode() == ActionCode.JOURNALIST_ROLE_CHECK) {
                privateMessages.add(new PrivateNightMessage(action.actorId(), "JOURNALIST_ROLE_RESULT", Map.of(
                        "targetUserId", target.getUserId(),
                        "targetRole", target.getRole(),
                        "targetStatus", target.getStatus()
                )));
            } else if (action.actionCode() == ActionCode.JOURNALIST_VISITOR_REPORT) {
                privateMessages.add(new PrivateNightMessage(action.actorId(), "JOURNALIST_VISITORS_RESULT", Map.of(
                        "targetUserId", target.getUserId(),
                        "visitorRoles", visitorsByTarget.getOrDefault(target.getUserId(), List.of())
                )));
            }
        }

        for (PrivateNightMessage message : privateMessages) {
            eventPublisher.sendPrivate(message.userId(), message.type(), message.payload());
        }

        room.getPlayers().values().forEach(GamePlayer::clearDayRestriction);
        nextDayRestrictions.forEach((playerId, restriction) -> {
            GamePlayer player = room.getPlayers().get(playerId);
            if (player != null && player.isAlive()) {
                player.setDayRestriction(restriction);
            }
        });
        room.getPendingNightActions().clear();

        if (checkWinner(room)) {
            eventPublisher.broadcast(room.getId(), "GAME_FINISHED", gameMapper.toRoomResponse(room, viewerId, 0));
            return;
        }

        room.setDayNumber(room.getDayNumber() + 1);
        room.setPhase(GamePhase.DAY_VOTING);
        room.setActiveVoteRound(new VoteRound(VoteRoundType.DAY_ELIMINATION, room.getDayNumber()));
        eventPublisher.broadcast(room.getId(), "NIGHT_RESOLVED", Map.of(
                "nightNumber", room.getNightNumber(),
                "eliminatedPlayerIds", killTargets
        ));
    }

    private void resolveDayVote(GameRoom room, Long viewerId) {
        VoteRound voteRound = room.getActiveVoteRound();
        Map<Long, Long> tally = voteRound.tally();
        Long eliminatedPlayerId = null;
        long maxVotes = 0L;
        boolean tie = false;

        for (Map.Entry<Long, Long> entry : tally.entrySet()) {
            if (entry.getValue() > maxVotes) {
                maxVotes = entry.getValue();
                eliminatedPlayerId = entry.getKey();
                tie = false;
            } else if (entry.getValue() == maxVotes) {
                tie = true;
            }
        }

        if (tie) {
            eliminatedPlayerId = null;
        }
        if (eliminatedPlayerId != null) {
            room.getPlayers().get(eliminatedPlayerId).eliminate();
        }

        voteRound.complete(eliminatedPlayerId);
        room.addVoteRoundToHistory(voteRound);
        room.setActiveVoteRound(null);
        room.getPlayers().values().forEach(GamePlayer::clearDayRestriction);
        eventPublisher.broadcast(room.getId(), "DAY_VOTE_COMPLETED", gameMapper.toVoteRoundResponse(voteRound));

        if (checkWinner(room)) {
            eventPublisher.broadcast(room.getId(), "GAME_FINISHED", gameMapper.toRoomResponse(room, viewerId, 0));
            return;
        }

        room.setPhase(GamePhase.NIGHT_ACTIONS);
        room.setNightNumber(room.getNightNumber() + 1);
        room.getPendingNightActions().clear();
    }

    private List<NightAction> actionsForPhase(List<NightAction> actions, NightResolutionPhase phase) {
        return actions.stream()
                .filter(action -> action.resolutionPhase() == phase)
                .sorted(Comparator.comparing(NightAction::priority).thenComparing(NightAction::submittedAt))
                .toList();
    }

    private Map<Long, List<PlayerRole>> collectVisitors(GameRoom room, List<NightAction> actions) {
        Map<Long, List<PlayerRole>> visitorsByTarget = new HashMap<>();
        for (NightAction action : actions) {
            if (action.targetId() == null) {
                continue;
            }
            GamePlayer actor = room.getPlayers().get(action.actorId());
            if (actor == null) {
                continue;
            }
            visitorsByTarget.computeIfAbsent(action.targetId(), ignored -> new ArrayList<>()).add(actor.getRole());
        }
        return visitorsByTarget;
    }

    private boolean canApplyActorAction(NightAction action, Set<Long> blockedActors) {
        return !blockedActors.contains(action.actorId());
    }

    private boolean canApplyTargetedAction(NightAction action, Set<Long> blockedActors, Set<Long> protectedTargets) {
        return action.targetId() != null
                && !blockedActors.contains(action.actorId())
                && !isProtectedTarget(action.targetId(), protectedTargets);
    }

    private boolean isProtectedTarget(Long targetId, Set<Long> protectedTargets) {
        return targetId != null && protectedTargets.contains(targetId);
    }

    private Faction effectiveInvestigationFaction(GamePlayer target, Map<Long, Faction> overrides) {
        return overrides.getOrDefault(target.getUserId(), target.getInvestigationFaction());
    }

    private Long resolveNightVictim(Map<Long, Long> mafiaVotes) {
        Long victimId = null;
        long maxVotes = 0L;
        boolean tie = false;
        for (Map.Entry<Long, Long> entry : mafiaVotes.entrySet()) {
            if (entry.getValue() > maxVotes) {
                maxVotes = entry.getValue();
                victimId = entry.getKey();
                tie = false;
            } else if (entry.getValue() == maxVotes) {
                tie = true;
            }
        }
        return tie ? null : victimId;
    }

    private boolean checkWinner(GameRoom room) {
        List<GamePlayer> alivePlayers = alivePlayers(room);
        Optional<GamePlayer> neutralManiac = alivePlayers.stream()
                .filter(player -> player.getRole() == PlayerRole.MANIAC && player.getRoleVariant() == RoleVariant.MANIAC_NEUTRAL)
                .findFirst();
        if (neutralManiac.isPresent() && alivePlayers.size() == 2) {
            room.setWinner(WinningTeam.NEUTRAL);
            room.setWinnerUserId(neutralManiac.get().getUserId());
            room.setPhase(GamePhase.FINISHED);
            return true;
        }

        long mafiaAlive = alivePlayers.stream().filter(player -> player.getFaction() == Faction.MAFIA).count();
        long othersAlive = alivePlayers.size() - mafiaAlive;
        if (mafiaAlive == 0) {
            room.setWinner(WinningTeam.TOWN);
            room.setWinnerUserId(null);
            room.setPhase(GamePhase.FINISHED);
            return true;
        }
        if (mafiaAlive >= othersAlive) {
            room.setWinner(WinningTeam.MAFIA);
            room.setWinnerUserId(null);
            room.setPhase(GamePhase.FINISHED);
            return true;
        }
        return false;
    }

    private int requiredNightActionCount(GameRoom room) {
        int count = 0;
        for (GamePlayer player : alivePlayers(room)) {
            count += player.getActionSlots().stream()
                    .map(ActionSlotDefinition::groupId)
                    .distinct()
                    .count();
        }
        return count;
    }

    private List<GamePlayer> eligibleDayVoters(GameRoom room) {
        return alivePlayers(room).stream()
                .filter(player -> player.getDayRestriction() == null || !player.getDayRestriction().isMuted())
                .toList();
    }

    private List<GamePlayer> alivePlayers(GameRoom room) {
        return room.getPlayers().values().stream().filter(GamePlayer::isAlive).toList();
    }

    private GameRoomResponse broadcastRoomState(GameRoom room, Long viewerId) {
        GameRoomResponse response = gameMapper.toRoomResponse(room, viewerId, requiredNightActionCount(room));
        eventPublisher.broadcastRoomState(room.getId(), response);
        return response;
    }

    private ActionSlotDefinition findActionSlot(GamePlayer actor, ActionCode actionCode) {
        return actor.getActionSlots().stream()
                .filter(slot -> slot.actionCode() == actionCode)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("The role does not have requested action"));
    }

    private void ensureGroupIsFree(GameRoom room, Long actorId, String groupId) {
        boolean alreadyUsed = room.getPendingNightActions().stream()
                .anyMatch(action -> action.actorId().equals(actorId) && action.groupId().equals(groupId));
        if (alreadyUsed) {
            throw new IllegalStateException("This action group has already been used this night");
        }
    }

    private Long validateNightTarget(GameRoom room, ActionSlotDefinition slot, Long targetUserId) {
        if (slot.targetRule() == TargetRule.REQUIRED_PLAYER && targetUserId == null) {
            throw new IllegalArgumentException("This action requires a target");
        }
        if (slot.targetRule() == TargetRule.OPTIONAL_PLAYER && targetUserId == null) {
            return null;
        }
        return getAlivePlayer(room, targetUserId).getUserId();
    }

    private void ensureParticipant(GameRoom room, Long userId) {
        if (!room.getPlayers().containsKey(userId)) {
            throw new IllegalStateException("User is not in the room");
        }
    }

    private void requirePhase(GameRoom room, GamePhase expectedPhase) {
        if (room.getPhase() != expectedPhase) {
            throw new IllegalStateException("Expected phase " + expectedPhase + " but was " + room.getPhase());
        }
    }

    private GameRoom getRoom(UUID roomId) {
        return roomStore.findById(roomId).orElseThrow(() -> new IllegalArgumentException("Room not found"));
    }

    private GamePlayer getPlayer(GameRoom room, Long userId) {
        GamePlayer player = room.getPlayers().get(userId);
        if (player == null) {
            throw new IllegalStateException("User is not in the room");
        }
        return player;
    }

    private GamePlayer getAlivePlayer(GameRoom room, Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("Target user id is required");
        }
        GamePlayer player = getPlayer(room, userId);
        if (player.getStatus() != PlayerStatus.ALIVE) {
            throw new IllegalStateException("Player is eliminated");
        }
        return player;
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("Authenticated user is required");
        }
        return user;
    }
}
