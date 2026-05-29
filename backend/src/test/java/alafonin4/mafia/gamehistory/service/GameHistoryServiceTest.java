package alafonin4.mafia.gamehistory.service;

import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.PlayerStatus;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.domain.VoteRoundType;
import alafonin4.mafia.game.domain.VoteStatus;
import alafonin4.mafia.game.domain.WinningTeam;
import alafonin4.mafia.game.dto.VoteEntryResponse;
import alafonin4.mafia.game.dto.VoteRoundResponse;
import alafonin4.mafia.gamehistory.dto.GameHistoryDetailResponse;
import alafonin4.mafia.gamehistory.dto.GameHistoryPlayerResponse;
import alafonin4.mafia.gamehistory.entity.CompletedGameRecord;
import alafonin4.mafia.gamehistory.repository.CompletedGameRecordRepository;
import alafonin4.mafia.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class GameHistoryServiceTest {
    @Autowired
    private GameHistoryService gameHistoryService;

    @Autowired
    private CompletedGameRecordRepository completedGameRecordRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getHistoryDetailsIncludesSignatureRecapAndParticipantGuard() {
        User viewer = createUser("viewer-history@example.com");
        User tiedAnalyst = createUser("tied-history@example.com");
        User pressureTarget = createUser("pressure-history@example.com");
        User lateTarget = createUser("late-history@example.com");
        User outsider = createUser("outsider-history@example.com");

        CompletedGameRecord record = new CompletedGameRecord();
        record.setRoomId(UUID.fromString("00000000-0000-0000-0000-000000000201"));
        record.setRoomName("Salon Rouge");
        record.setWinner(WinningTeam.TOWN);
        record.setNightNumber(1);
        record.setDayNumber(2);
        record.setFinishedAt(LocalDateTime.of(2026, 5, 5, 21, 0));

        List<GameHistoryPlayerResponse> players = List.of(
                player(viewer, true, PlayerStatus.ALIVE, PlayerRole.COMMISSIONER, RoleVariant.DEFAULT, Faction.TOWN),
                player(tiedAnalyst, false, PlayerStatus.ALIVE, PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN),
                player(pressureTarget, false, PlayerStatus.ELIMINATED, PlayerRole.MAFIA, RoleVariant.DEFAULT, Faction.MAFIA),
                player(lateTarget, false, PlayerStatus.ELIMINATED, PlayerRole.NINJA, RoleVariant.DEFAULT, Faction.MAFIA)
        );
        record.setParticipantCount(players.size());
        record.setParticipantIds(players.stream().map(GameHistoryPlayerResponse::userId).collect(Collectors.toSet()));
        record.setPlayersJson(writeJson(players));
        record.setVoteHistoryJson(writeJson(List.of(
                voteRound(1, pressureTarget.getId(), Map.of(
                        viewer.getId(), pressureTarget.getId(),
                        tiedAnalyst.getId(), pressureTarget.getId(),
                        pressureTarget.getId(), viewer.getId(),
                        lateTarget.getId(), viewer.getId()
                )),
                voteRound(2, lateTarget.getId(), Map.of(
                        viewer.getId(), lateTarget.getId(),
                        tiedAnalyst.getId(), lateTarget.getId(),
                        lateTarget.getId(), pressureTarget.getId()
                ))
        )));
        completedGameRecordRepository.save(record);

        setCurrentUser(viewer);
        GameHistoryDetailResponse details = gameHistoryService.getHistoryDetails(record.getId());

        assertEquals("Salon Rouge", details.recap().headline().roomName());
        assertEquals(4, details.recap().awards().size());
        assertEquals(viewer.getId(), details.recap().awards().get(0).recipientUserId());
        assertEquals(viewer.getId(), details.recap().awards().get(1).recipientUserId());
        assertEquals(pressureTarget.getId(), details.recap().awards().get(2).recipientUserId());
        assertEquals(2, details.recap().survivors().size());
        assertTrue(details.recap().tableSummary().stream().anyMatch(metric -> metric.label().equals("Ballots cast") && metric.value().equals("7")));

        setCurrentUser(outsider);
        assertThrows(IllegalStateException.class, () -> gameHistoryService.getHistoryDetails(record.getId()));
    }

    private User createUser(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("encoded");
        return userRepository.save(user);
    }

    private void setCurrentUser(User user) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    private GameHistoryPlayerResponse player(User user,
                                             boolean host,
                                             PlayerStatus status,
                                             PlayerRole role,
                                             RoleVariant variant,
                                             Faction faction) {
        return new GameHistoryPlayerResponse(user.getId(), user.getEmail(), host, status, role, variant, faction);
    }

    private VoteRoundResponse voteRound(int roundNumber, Long eliminatedPlayerId, Map<Long, Long> votes) {
        List<VoteEntryResponse> entries = votes.entrySet().stream()
                .map(entry -> new VoteEntryResponse(entry.getKey(), entry.getValue(), null))
                .toList();
        return new VoteRoundResponse(
                UUID.randomUUID(),
                VoteRoundType.DAY_ELIMINATION,
                roundNumber,
                VoteStatus.COMPLETED,
                null,
                null,
                eliminatedPlayerId,
                votes.values().stream().collect(Collectors.toMap(value -> value, value -> 1L, Long::sum)),
                entries
        );
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
