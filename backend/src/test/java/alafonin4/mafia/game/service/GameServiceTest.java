package alafonin4.mafia.game.service;

import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.ActionCode;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.PlayerStatus;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.dto.CreateRoomRequest;
import alafonin4.mafia.game.dto.DayVoteRequest;
import alafonin4.mafia.game.dto.GamePlayerResponse;
import alafonin4.mafia.game.dto.GameRoomResponse;
import alafonin4.mafia.game.dto.NightActionRequest;
import alafonin4.mafia.game.dto.RoleSlotRequest;
import alafonin4.mafia.gamehistory.repository.CompletedGameRecordRepository;
import alafonin4.mafia.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class GameServiceTest {
    @Autowired
    private GameService gameService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompletedGameRecordRepository completedGameRecordRepository;

    @Test
    void mafiaManiacNeedsBothNightActionGroupsAndCanShootIntoAir() {
        User host = createUser("host@example.com");
        User second = createUser("second-maniac@example.com");
        User third = createUser("third-maniac@example.com");
        User fourth = createUser("fourth-maniac@example.com");
        User fifth = createUser("fifth-maniac@example.com");

        setCurrentUser(host);
        GameRoomResponse room = gameService.createRoom(new CreateRoomRequest(
                "mafia-maniac",
                List.of(
                        new RoleSlotRequest(PlayerRole.MANIAC, RoleVariant.MANIAC_MAFIA),
                        new RoleSlotRequest(PlayerRole.NINJA, RoleVariant.DEFAULT),
                        new RoleSlotRequest(PlayerRole.COMMISSIONER, RoleVariant.DEFAULT),
                        new RoleSlotRequest(PlayerRole.CITIZEN, RoleVariant.DEFAULT)
                )
        ));
        UUID roomId = room.roomId();

        joinAndReady(roomId, List.of(host, second, third, fourth, fifth));

        setCurrentUser(host);
        gameService.startGame(roomId);

        Map<PlayerRole, User> assignedUsers = mapUsersByRole(roomId, List.of(second, third, fourth, fifth));
        User mafiaManiac = assignedUsers.get(PlayerRole.MANIAC);
        User ninja = assignedUsers.get(PlayerRole.NINJA);
        User commissioner = assignedUsers.get(PlayerRole.COMMISSIONER);
        User citizen = assignedUsers.get(PlayerRole.CITIZEN);

        setCurrentUser(host);
        GameRoomResponse hostView = gameService.getRoomState(roomId);
        assertNotNull(playerView(hostView, mafiaManiac.getId()).visibleRole());
        assertNotNull(playerView(hostView, mafiaManiac.getId()).visibleFaction());

        setCurrentUser(mafiaManiac);
        gameService.submitNightAction(roomId, new NightActionRequest(citizen.getId(), ActionCode.MAFIA_KILL));
        setCurrentUser(ninja);
        gameService.submitNightAction(roomId, new NightActionRequest(citizen.getId(), ActionCode.MAFIA_KILL));
        setCurrentUser(commissioner);
        GameRoomResponse afterThreeActions = gameService.submitNightAction(roomId, new NightActionRequest(ninja.getId(), ActionCode.ALIGNMENT_CHECK));

        assertEquals(GamePhase.NIGHT_ACTIONS, afterThreeActions.phase());

        setCurrentUser(mafiaManiac);
        GameRoomResponse afterFourthAction = gameService.submitNightAction(roomId, new NightActionRequest(null, ActionCode.ROLE_KILL));

        assertEquals(GamePhase.FINISHED, afterFourthAction.phase());
        assertEquals(PlayerStatus.ELIMINATED, playerView(afterFourthAction, citizen.getId()).status());
        assertTrue(completedGameRecordRepository.findByRoomId(roomId).isPresent());
    }

    @Test
    void bodyguardStopsAllNightActionsOnTarget() {
        User host = createUser("host-guard@example.com");
        User second = createUser("second-guard@example.com");
        User third = createUser("third-guard@example.com");
        User fourth = createUser("fourth-guard@example.com");
        User fifth = createUser("fifth-guard@example.com");

        setCurrentUser(host);
        GameRoomResponse room = gameService.createRoom(new CreateRoomRequest(
                "bodyguard-room",
                List.of(
                        new RoleSlotRequest(PlayerRole.BODYGUARD, RoleVariant.DEFAULT),
                        new RoleSlotRequest(PlayerRole.PROSTITUTE, RoleVariant.PROSTITUTE_MUTE_AND_VOTE_SHIELD),
                        new RoleSlotRequest(PlayerRole.MAFIA, RoleVariant.DEFAULT),
                        new RoleSlotRequest(PlayerRole.CITIZEN, RoleVariant.DEFAULT)
                )
        ));
        UUID roomId = room.roomId();

        joinAndReady(roomId, List.of(host, second, third, fourth, fifth));

        setCurrentUser(host);
        gameService.startGame(roomId);

        Map<PlayerRole, User> assignedUsers = mapUsersByRole(roomId, List.of(second, third, fourth, fifth));
        User bodyguard = assignedUsers.get(PlayerRole.BODYGUARD);
        User prostitute = assignedUsers.get(PlayerRole.PROSTITUTE);
        User mafia = assignedUsers.get(PlayerRole.MAFIA);
        User citizen = assignedUsers.get(PlayerRole.CITIZEN);

        setCurrentUser(bodyguard);
        gameService.submitNightAction(roomId, new NightActionRequest(citizen.getId(), ActionCode.BODYGUARD_PROTECT));
        setCurrentUser(prostitute);
        gameService.submitNightAction(roomId, new NightActionRequest(citizen.getId(), ActionCode.PROSTITUTE_MUTE_SHIELD));
        setCurrentUser(mafia);
        GameRoomResponse afterNight = gameService.submitNightAction(roomId, new NightActionRequest(citizen.getId(), ActionCode.MAFIA_KILL));

        GamePlayerResponse citizenView = playerView(afterNight, citizen.getId());
        assertEquals(GamePhase.DAY_VOTING, afterNight.phase());
        assertEquals(PlayerStatus.ALIVE, citizenView.status());
        assertFalse(citizenView.muted());
        assertFalse(citizenView.voteImmune());

        setCurrentUser(host);
        assertThrows(IllegalStateException.class,
                () -> gameService.submitDayVote(roomId, new DayVoteRequest(citizen.getId())));

        setCurrentUser(bodyguard);
        gameService.submitDayVote(roomId, new DayVoteRequest(citizen.getId()));
        setCurrentUser(prostitute);
        gameService.submitDayVote(roomId, new DayVoteRequest(citizen.getId()));
        setCurrentUser(mafia);
        gameService.submitDayVote(roomId, new DayVoteRequest(citizen.getId()));
        setCurrentUser(citizen);
        GameRoomResponse afterDayVote = gameService.submitDayVote(roomId, new DayVoteRequest(citizen.getId()));

        assertEquals(GamePhase.NIGHT_ACTIONS, afterDayVote.phase());
        assertEquals(PlayerStatus.ELIMINATED, playerView(afterDayVote, citizen.getId()).status());
    }

    private void joinAndReady(UUID roomId, List<User> users) {
        for (int index = 1; index < users.size(); index++) {
            setCurrentUser(users.get(index));
            gameService.joinRoom(roomId);
        }
        for (User user : users) {
            setCurrentUser(user);
            gameService.toggleReady(roomId);
        }
    }

    private Map<PlayerRole, User> mapUsersByRole(UUID roomId, List<User> users) {
        return users.stream().collect(Collectors.toMap(
                user -> {
                    setCurrentUser(user);
                    return gameService.getRoomState(roomId).currentUserRole();
                },
                user -> user
        ));
    }

    private GamePlayerResponse playerView(GameRoomResponse room, Long userId) {
        return room.players().stream()
                .filter(player -> player.userId().equals(userId))
                .findFirst()
                .orElseThrow();
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
}
