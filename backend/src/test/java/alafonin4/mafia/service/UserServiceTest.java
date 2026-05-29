package alafonin4.mafia.service;

import alafonin4.mafia.dto.user.PlayerDossierResponse;
import alafonin4.mafia.dto.user.NicknameAvailabilityResponse;
import alafonin4.mafia.dto.user.UserLanguage;
import alafonin4.mafia.dto.user.UserRequest;
import alafonin4.mafia.dto.user.UserProfileResponse;
import alafonin4.mafia.dto.user.UserResponse;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
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
import alafonin4.mafia.game.service.GameRoleCatalogService;
import alafonin4.mafia.gamehistory.dto.GameHistoryPlayerResponse;
import alafonin4.mafia.gamehistory.entity.CompletedGameRecord;
import alafonin4.mafia.gamehistory.repository.CompletedGameRecordRepository;
import alafonin4.mafia.repository.FriendRequestRepository;
import alafonin4.mafia.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class UserServiceTest {
    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameRoleCatalogService roleCatalogService;

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private CompletedGameRecordRepository completedGameRecordRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EntityManager entityManager;

    @Test
    void updateInfoAboutCurrentUserStoresAvatarAndRolePreferences() {
        User user = createUser("profile@example.com");
        setCurrentUser(user);
        List<String> roleIds = roleCatalogService.supportedRoleIds().stream().limit(3).toList();

        UserResponse response = userService.updateInfoAboutCurrentUser(new UserRequest(
                "Host",
                "data:image/png;base64,AAA",
                roleIds.subList(0, 2),
                List.of(roleIds.get(2)),
                UserLanguage.RU
        ));

        assertEquals("Host", response.nickname());
        assertEquals("data:image/png;base64,AAA", response.avatarUrl());
        assertEquals(roleIds.subList(0, 2), response.favoriteRoleIds());
        assertEquals(List.of(roleIds.get(2)), response.dislikedRoleIds());
        assertEquals(UserLanguage.RU, response.language());
    }

    @Test
    void updateInfoAboutCurrentUserRejectsMoreThanThreeFavoriteRoles() {
        User user = createUser("profile-limit@example.com");
        setCurrentUser(user);
        List<String> roleIds = roleCatalogService.supportedRoleIds().stream().limit(4).toList();

        assertThrows(IllegalArgumentException.class, () -> userService.updateInfoAboutCurrentUser(new UserRequest(
                "Player",
                null,
                roleIds,
                List.of(),
                null
        )));
    }

    @Test
    void updateInfoAboutCurrentUserRejectsTakenNickname() {
        User user = createUser("profile-owner@example.com");
        User other = createUser("profile-other@example.com");
        other.setNickname("VelvetHost");
        userRepository.save(other);
        setCurrentUser(user);

        assertThrows(IllegalStateException.class, () -> userService.updateInfoAboutCurrentUser(new UserRequest(
                "VelvetHost",
                null,
                List.of(),
                List.of(),
                null
        )));
    }

    @Test
    void getNicknameAvailabilityAllowsCurrentNicknameAndRejectsTakenOne() {
        User user = createUser("availability@example.com");
        user.setNickname("HouseGuest");
        userRepository.save(user);

        User other = createUser("occupied@example.com");
        other.setNickname("ReservedName");
        userRepository.save(other);

        setCurrentUser(user);

        NicknameAvailabilityResponse currentNickname = userService.getNicknameAvailability("houseguest");
        NicknameAvailabilityResponse occupiedNickname = userService.getNicknameAvailability("ReservedName");

        assertTrue(currentNickname.available());
        assertFalse(occupiedNickname.available());
    }

    @Test
    void getUserProfileIncludesIncomingRequestRelation() {
        User viewer = createUser("viewer@example.com");
        User other = createUser("other@example.com");
        FriendRequest request = new FriendRequest();
        request.setSender(other);
        request.setReceiver(viewer);
        request.setStatus(FriendRequestStatus.PENDING);
        friendRequestRepository.save(request);
        setCurrentUser(viewer);

        UserProfileResponse response = userService.getUserProfile(other.getId());

        assertEquals(other.getId(), response.id());
        assertEquals(alafonin4.mafia.dto.user.FriendRelation.INCOMING_REQUEST, response.relation());
        assertEquals(request.getId(), response.requestId());
    }

    @Test
    void getUserDossierAggregatesFinishedGamesForFriends() {
        User viewer = createUser("viewer-dossier@example.com");
        User subject = createUser("subject-dossier@example.com");
        subject.setRating(1125);
        User ally = createUser("ally-dossier@example.com");
        User rival = createUser("rival-dossier@example.com");
        User guest = createUser("guest-dossier@example.com");

        FriendRequest request = new FriendRequest();
        request.setSender(viewer);
        request.setReceiver(subject);
        request.setStatus(FriendRequestStatus.ACCEPTED);
        friendRequestRepository.save(request);

        saveCompletedGame(
                UUID.fromString("00000000-0000-0000-0000-000000000101"),
                "Velvet Table I",
                WinningTeam.TOWN,
                null,
                1,
                1,
                LocalDateTime.of(2026, 5, 3, 20, 0),
                List.of(
                        player(subject, true, PlayerStatus.ALIVE, PlayerRole.COMMISSIONER, RoleVariant.DEFAULT, Faction.TOWN),
                        player(ally, false, PlayerStatus.ALIVE, PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN),
                        player(rival, false, PlayerStatus.ELIMINATED, PlayerRole.MAFIA, RoleVariant.DEFAULT, Faction.MAFIA),
                        player(guest, false, PlayerStatus.ELIMINATED, PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN)
                ),
                List.of(voteRound(1, rival.getId(), Map.of(
                        subject.getId(), rival.getId(),
                        ally.getId(), rival.getId(),
                        rival.getId(), subject.getId()
                )))
        );

        saveCompletedGame(
                UUID.fromString("00000000-0000-0000-0000-000000000102"),
                "Velvet Table II",
                WinningTeam.MAFIA,
                null,
                1,
                1,
                LocalDateTime.of(2026, 5, 2, 20, 0),
                List.of(
                        player(subject, false, PlayerStatus.ELIMINATED, PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN),
                        player(ally, false, PlayerStatus.ALIVE, PlayerRole.MAFIA, RoleVariant.DEFAULT, Faction.MAFIA),
                        player(rival, false, PlayerStatus.ALIVE, PlayerRole.NINJA, RoleVariant.DEFAULT, Faction.MAFIA),
                        player(guest, true, PlayerStatus.ELIMINATED, PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN)
                ),
                List.of(voteRound(1, guest.getId(), Map.of(
                        subject.getId(), guest.getId(),
                        ally.getId(), guest.getId(),
                        rival.getId(), guest.getId()
                )))
        );

        saveCompletedGame(
                UUID.fromString("00000000-0000-0000-0000-000000000103"),
                "Velvet Table III",
                WinningTeam.TOWN,
                null,
                2,
                2,
                LocalDateTime.of(2026, 5, 1, 20, 0),
                List.of(
                        player(subject, false, PlayerStatus.ALIVE, PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN),
                        player(ally, false, PlayerStatus.ALIVE, PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN),
                        player(rival, false, PlayerStatus.ELIMINATED, PlayerRole.MAFIA, RoleVariant.DEFAULT, Faction.MAFIA),
                        player(guest, true, PlayerStatus.ELIMINATED, PlayerRole.BODYGUARD, RoleVariant.DEFAULT, Faction.TOWN)
                ),
                List.of(voteRound(1, rival.getId(), Map.of(
                        subject.getId(), rival.getId(),
                        ally.getId(), rival.getId(),
                        rival.getId(), subject.getId()
                )))
        );

        entityManager.flush();
        entityManager.clear();
        viewer = userRepository.findById(viewer.getId()).orElseThrow();
        subject = userRepository.findById(subject.getId()).orElseThrow();
        setCurrentUser(viewer);
        PlayerDossierResponse dossier = userService.getUserDossier(subject.getId());

        assertEquals(alafonin4.mafia.dto.user.FriendRelation.FRIEND, dossier.user().relation());
        assertEquals(3, dossier.career().totalGames());
        assertEquals(2, dossier.career().wins());
        assertEquals(1, dossier.career().hostedGames());
        assertEquals(1125, dossier.career().rating());
        assertEquals("W", dossier.form().currentStreakResult());
        assertEquals(1, dossier.form().currentStreakCount());
        assertEquals(2, dossier.mastery().get(0).playCount());
        assertEquals("Citizen", dossier.mastery().get(0).roleName());
        assertEquals(3, dossier.voting().totalDayVotesCast());
        assertNotNull(dossier.voting().mafiaCatchRate());
        assertEquals(3, dossier.connections().get(0).sharedGames());
        assertEquals(3, dossier.recentGames().size());
        assertTrue(dossier.recentGames().get(0).won());
        assertTrue(dossier.connections().stream().anyMatch(connection -> connection.sharedGames() == 3));
        assertTrue(!dossier.limited());
    }

    @Test
    void getUserDossierRejectsNonFriends() {
        User viewer = createUser("viewer-private@example.com");
        User subject = createUser("subject-private@example.com");

        setCurrentUser(viewer);

        assertThrows(IllegalStateException.class, () -> userService.getUserDossier(subject.getId()));
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
                votes.values().stream().collect(java.util.stream.Collectors.toMap(
                        value -> value,
                        value -> 1L,
                        Long::sum
                )),
                entries
        );
    }

    private void saveCompletedGame(UUID roomId,
                                   String roomName,
                                   WinningTeam winner,
                                   Long winnerUserId,
                                   int nightNumber,
                                   int dayNumber,
                                   LocalDateTime finishedAt,
                                   List<GameHistoryPlayerResponse> players,
                                   List<VoteRoundResponse> voteHistory) {
        CompletedGameRecord record = new CompletedGameRecord();
        record.setRoomId(roomId);
        record.setRoomName(roomName);
        record.setWinner(winner);
        record.setWinnerUserId(winnerUserId);
        record.setNightNumber(nightNumber);
        record.setDayNumber(dayNumber);
        record.setFinishedAt(finishedAt);
        record.setParticipantCount(players.size());
        record.setParticipantIds(players.stream().map(GameHistoryPlayerResponse::userId).collect(java.util.stream.Collectors.toSet()));
        record.setPlayersJson(writeJson(players));
        record.setVoteHistoryJson(writeJson(voteHistory));
        completedGameRecordRepository.save(record);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
