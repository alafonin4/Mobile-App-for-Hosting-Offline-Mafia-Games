package alafonin4.mafia.service;

import alafonin4.mafia.dto.friend.FriendRequestResponse;
import alafonin4.mafia.dto.user.FriendRelation;
import alafonin4.mafia.dto.user.UserProfileResponse;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
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

@SpringBootTest
@Transactional
class FriendServiceTest {
    @Autowired
    private FriendService friendService;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Test
    void cancelFriendRequestMarksOutgoingRequestCanceled() {
        User sender = createUser("sender@example.com");
        User receiver = createUser("receiver@example.com");
        FriendRequest request = friendRequestRepository.save(FriendRequest.builder()
                .sender(sender)
                .receiver(receiver)
                .status(FriendRequestStatus.PENDING)
                .build());
        setCurrentUser(sender);

        FriendRequestResponse response = friendService.cancelFriendRequest(request.getId());

        assertEquals(FriendRequestStatus.CANCELED, response.status());
        assertEquals(FriendRequestStatus.CANCELED, friendRequestRepository.findById(request.getId()).orElseThrow().getStatus());
    }

    @Test
    void removeFriendMarksFriendshipCanceledAndProfileFallsBackToNone() {
        User first = createUser("friend-one@example.com");
        User second = createUser("friend-two@example.com");
        FriendRequest request = friendRequestRepository.save(FriendRequest.builder()
                .sender(first)
                .receiver(second)
                .status(FriendRequestStatus.ACCEPTED)
                .build());

        setCurrentUser(first);
        friendService.removeFriend(second.getId());

        assertEquals(FriendRequestStatus.CANCELED, friendRequestRepository.findById(request.getId()).orElseThrow().getStatus());

        UserProfileResponse profile = userService.getUserProfile(second.getId());
        assertEquals(FriendRelation.NONE, profile.relation());
        assertEquals(null, profile.requestId());
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
