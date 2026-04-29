package alafonin4.mafia.service;

import alafonin4.mafia.dto.user.UserRequest;
import alafonin4.mafia.dto.user.UserProfileResponse;
import alafonin4.mafia.dto.user.UserResponse;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.service.GameRoleCatalogService;
import alafonin4.mafia.repository.FriendRequestRepository;
import alafonin4.mafia.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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

    @Test
    void updateInfoAboutCurrentUserStoresAvatarAndRolePreferences() {
        User user = createUser("profile@example.com");
        setCurrentUser(user);
        List<String> roleIds = roleCatalogService.supportedRoleIds().stream().limit(3).toList();

        UserResponse response = userService.updateInfoAboutCurrentUser(new UserRequest(
                "Host",
                "data:image/png;base64,AAA",
                roleIds.subList(0, 2),
                List.of(roleIds.get(2))
        ));

        assertEquals("Host", response.nickname());
        assertEquals("data:image/png;base64,AAA", response.avatarUrl());
        assertEquals(roleIds.subList(0, 2), response.favoriteRoleIds());
        assertEquals(List.of(roleIds.get(2)), response.dislikedRoleIds());
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
                List.of()
        )));
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
