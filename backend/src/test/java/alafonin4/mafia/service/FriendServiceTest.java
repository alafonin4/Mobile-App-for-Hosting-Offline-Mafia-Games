package alafonin4.mafia.service;

import alafonin4.mafia.dto.friend.FriendRequestResponse;
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
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
class FriendServiceTest {
    @Autowired
    private FriendService friendService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Test
    void sendFriendRequestCreatesPendingRelationAndBlocksActiveDuplicates() {
        User sender = createUser("sender@example.com");
        User receiver = createUser("receiver@example.com");

        setCurrentUser(sender);
        FriendRequestResponse response = friendService.sendFriendRequestToUser(receiver.getId());

        assertEquals(FriendRequestStatus.PENDING, response.status());
        assertEquals(sender.getId(), response.senderId());
        assertEquals(receiver.getId(), response.receiverId());

        assertThrows(IllegalStateException.class, () -> friendService.sendFriendRequestToUser(receiver.getId()));
    }

    @Test
    void onlyReceiverCanAcceptPendingFriendRequest() {
        User sender = createUser("sender-accept@example.com");
        User receiver = createUser("receiver-accept@example.com");
        User stranger = createUser("stranger-accept@example.com");

        setCurrentUser(sender);
        FriendRequestResponse response = friendService.sendFriendRequestToUser(receiver.getId());

        setCurrentUser(stranger);
        assertThrows(IllegalStateException.class, () -> friendService.acceptFriendRequest(response.id()));

        setCurrentUser(receiver);
        FriendRequestResponse accepted = friendService.acceptFriendRequest(response.id());

        assertEquals(FriendRequestStatus.ACCEPTED, accepted.status());
        List<FriendRequest> relations = friendRequestRepository.findAllBetweenUsers(sender, receiver);
        assertEquals(1, relations.size());
        assertEquals(FriendRequestStatus.ACCEPTED, relations.get(0).getStatus());
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
