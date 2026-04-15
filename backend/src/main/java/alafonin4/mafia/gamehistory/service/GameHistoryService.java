package alafonin4.mafia.gamehistory.service;

import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.domain.GamePlayer;
import alafonin4.mafia.game.domain.GameRoom;
import alafonin4.mafia.game.dto.VoteRoundResponse;
import alafonin4.mafia.game.service.GameMapper;
import alafonin4.mafia.game.store.GameRoomStore;
import alafonin4.mafia.gamehistory.dto.GameHistoryDetailResponse;
import alafonin4.mafia.gamehistory.dto.GameHistoryListItemResponse;
import alafonin4.mafia.gamehistory.dto.GameHistoryPlayerResponse;
import alafonin4.mafia.gamehistory.entity.CompletedGameRecord;
import alafonin4.mafia.gamehistory.repository.CompletedGameRecordRepository;
import alafonin4.mafia.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GameHistoryService {
    private final CompletedGameRecordRepository completedGameRecordRepository;
    private final GameRoomStore gameRoomStore;
    private final GameMapper gameMapper;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    public GameHistoryService(CompletedGameRecordRepository completedGameRecordRepository, GameRoomStore gameRoomStore,
                              GameMapper gameMapper, ObjectMapper objectMapper, UserRepository userRepository) {
        this.completedGameRecordRepository = completedGameRecordRepository;
        this.gameRoomStore = gameRoomStore;
        this.gameMapper = gameMapper;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
    }

    @Transactional
    public void persistFinishedGame(GameRoom room) {
        if (room.getPhase() != GamePhase.FINISHED) {
            return;
        }
        if (completedGameRecordRepository.findByRoomId(room.getId()).isPresent()) {
            return;
        }
        saveSnapshot(room);
    }

    @Transactional
    public void refreshFinishedGameSnapshots() {
        for (GameRoom room : gameRoomStore.findAll().values()) {
            persistFinishedGame(room);
        }
    }

    @Transactional
    public List<GameHistoryListItemResponse> getHistoryForCurrentUser() {
        refreshFinishedGameSnapshots();
        return completedGameRecordRepository.findAllForParticipant(currentUser().getId()).stream()
                .map(this::toListItem)
                .toList();
    }

    @Transactional
    public GameHistoryDetailResponse getHistoryDetails(Long id) {
        refreshFinishedGameSnapshots();
        User currentUser = currentUser();
        CompletedGameRecord record = completedGameRecordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Game history entry not found"));
        if (!record.getParticipantIds().contains(currentUser.getId())) {
            throw new IllegalStateException("Current user did not participate in this game");
        }
        return toDetail(record);
    }

    private void saveSnapshot(GameRoom room) {
        CompletedGameRecord record = new CompletedGameRecord();
        record.setRoomId(room.getId());
        record.setRoomName(room.getName());
        record.setWinner(room.getWinner());
        record.setWinnerUserId(room.getWinnerUserId());
        record.setNightNumber(room.getNightNumber());
        record.setDayNumber(room.getDayNumber());
        record.setFinishedAt(LocalDateTime.now());
        record.setParticipantCount(room.getPlayers().size());
        record.setParticipantIds(new HashSet<>(room.getPlayers().keySet()));
        record.setPlayersJson(writeJson(room.getPlayers().values().stream().map(this::toHistoryPlayer).toList()));
        record.setVoteHistoryJson(writeJson(room.getVoteHistory().stream().map(gameMapper::toVoteRoundResponse).toList()));
        completedGameRecordRepository.save(record);
        updateUserStats(room);
    }

    private void updateUserStats(GameRoom room) {
        List<User> users = userRepository.findAllById(room.getPlayers().keySet());
        Map<Long, User> usersById = users.stream().collect(Collectors.toMap(User::getId, user -> user));
        for (GamePlayer player : room.getPlayers().values()) {
            User user = usersById.get(player.getUserId());
            if (user == null) {
                continue;
            }
            user.setGamesPlayed(user.getGamesPlayed() + 1);
            if (isWinner(player, room)) {
                user.setWins(user.getWins() + 1);
                user.setRating(user.getRating() + 25);
            } else {
                user.setRating(Math.max(0, user.getRating() - 10));
            }
        }
        userRepository.saveAll(users);
    }

    private boolean isWinner(GamePlayer player, GameRoom room) {
        return switch (room.getWinner()) {
            case TOWN -> player.getFaction() == Faction.TOWN;
            case MAFIA -> player.getFaction() == Faction.MAFIA;
            case NEUTRAL -> room.getWinnerUserId() != null && room.getWinnerUserId().equals(player.getUserId());
            default -> false;
        };
    }

    private GameHistoryListItemResponse toListItem(CompletedGameRecord record) {
        return new GameHistoryListItemResponse(
                record.getId(),
                record.getRoomId(),
                record.getRoomName(),
                record.getWinner(),
                record.getWinnerUserId(),
                record.getFinishedAt(),
                record.getNightNumber(),
                record.getDayNumber(),
                record.getParticipantCount()
        );
    }

    private GameHistoryDetailResponse toDetail(CompletedGameRecord record) {
        return new GameHistoryDetailResponse(
                record.getId(),
                record.getRoomId(),
                record.getRoomName(),
                record.getWinner(),
                record.getWinnerUserId(),
                record.getFinishedAt(),
                record.getNightNumber(),
                record.getDayNumber(),
                readPlayers(record.getPlayersJson()),
                readVoteHistory(record.getVoteHistoryJson())
        );
    }

    private GameHistoryPlayerResponse toHistoryPlayer(GamePlayer player) {
        return new GameHistoryPlayerResponse(
                player.getUserId(),
                player.getEmail(),
                player.isHost(),
                player.getStatus(),
                player.getRole(),
                player.getRoleVariant(),
                player.getFaction()
        );
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot serialize completed game snapshot", exception);
        }
    }

    private List<GameHistoryPlayerResponse> readPlayers(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot deserialize game players", exception);
        }
    }

    private List<VoteRoundResponse> readVoteHistory(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot deserialize vote history", exception);
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("Authenticated user is required");
        }
        return user;
    }
}
