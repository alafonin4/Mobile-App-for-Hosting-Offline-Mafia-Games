package alafonin4.mafia.service;

import alafonin4.mafia.dto.friend.FriendRequestResponse;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.repository.FriendRequestRepository;
import alafonin4.mafia.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendService {
    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final NotificationService notificationService;

    public FriendRequestResponse sendFriendRequestToUser(long receiverId) {
        User sender = currentUser();
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        if (sender.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("You cannot send a friend request to yourself");
        }

        ensureNoActiveRelation(sender, receiver);

        FriendRequest friendRequest = FriendRequest.builder()
                .sender(sender)
                .receiver(receiver)
                .status(FriendRequestStatus.PENDING)
                .build();

        FriendRequest saved = friendRequestRepository.save(friendRequest);
        notificationService.createFriendRequestReceivedNotification(saved);
        return toResponse(saved);
    }

    public FriendRequestResponse acceptFriendRequest(long requestId) {
        User receiver = currentUser();
        FriendRequest friendRequest = getPendingRequestForReceiver(requestId, receiver);
        friendRequest.setStatus(FriendRequestStatus.ACCEPTED);
        FriendRequest saved = friendRequestRepository.save(friendRequest);
        notificationService.createFriendRequestAcceptedNotification(saved);
        return toResponse(saved);
    }

    public List<FriendRequestResponse> sentListOfFriends() {
        User user = currentUser();
        return friendRequestRepository.findAllByUserAndStatus(user, FriendRequestStatus.ACCEPTED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public FriendRequestResponse rejectFriendRequest(Long requestId) {
        User receiver = currentUser();
        FriendRequest friendRequest = getPendingRequestForReceiver(requestId, receiver);
        friendRequest.setStatus(FriendRequestStatus.REJECTED);
        return toResponse(friendRequestRepository.save(friendRequest));
    }

    public FriendRequestResponse cancelFriendRequest(Long requestId) {
        User sender = currentUser();
        FriendRequest friendRequest = getPendingRequestForSender(requestId, sender);
        friendRequest.setStatus(FriendRequestStatus.CANCELED);
        return toResponse(friendRequestRepository.save(friendRequest));
    }

    public void removeFriend(Long userId) {
        User currentUser = currentUser();
        User otherUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (currentUser.getId().equals(otherUser.getId())) {
            throw new IllegalArgumentException("You cannot remove yourself from friends");
        }

        FriendRequest friendship = friendRequestRepository.findAllBetweenUsers(currentUser, otherUser).stream()
                .filter(request -> request.getStatus() == FriendRequestStatus.ACCEPTED)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Users are not friends"));

        friendship.setStatus(FriendRequestStatus.CANCELED);
        friendRequestRepository.save(friendship);
    }

    public List<FriendRequestResponse> getPendingSentRequests() {
        User user = currentUser();
        return friendRequestRepository.findAllBySenderAndStatus(user, FriendRequestStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<FriendRequestResponse> getPendingReceivedRequests() {
        User user = currentUser();
        return friendRequestRepository.findAllByReceiverAndStatus(user, FriendRequestStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void ensureNoActiveRelation(User first, User second) {
        boolean hasActiveRelation = friendRequestRepository.findAllBetweenUsers(first, second).stream()
                .anyMatch(request -> request.getStatus() == FriendRequestStatus.PENDING
                        || request.getStatus() == FriendRequestStatus.ACCEPTED);
        if (hasActiveRelation) {
            throw new IllegalStateException("An active friend request or friendship already exists");
        }
    }

    private FriendRequest getPendingRequestForReceiver(Long requestId, User receiver) {
        FriendRequest friendRequest = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (!friendRequest.getReceiver().getId().equals(receiver.getId())) {
            throw new IllegalStateException("Only the receiver can process this friend request");
        }
        if (friendRequest.getStatus() != FriendRequestStatus.PENDING) {
            throw new IllegalStateException("Only pending friend requests can be processed");
        }
        return friendRequest;
    }

    private FriendRequest getPendingRequestForSender(Long requestId, User sender) {
        FriendRequest friendRequest = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Friend request not found"));

        if (!friendRequest.getSender().getId().equals(sender.getId())) {
            throw new IllegalStateException("Only the sender can cancel this friend request");
        }
        if (friendRequest.getStatus() != FriendRequestStatus.PENDING) {
            throw new IllegalStateException("Only pending friend requests can be canceled");
        }
        return friendRequest;
    }

    private FriendRequestResponse toResponse(FriendRequest friendRequest) {
        return new FriendRequestResponse(
                friendRequest.getId(),
                friendRequest.getStatus(),
                friendRequest.getSender().getId(),
                friendRequest.getSender().getNickname(),
                friendRequest.getSender().getEmail(),
                friendRequest.getSender().getAvatarUrl(),
                friendRequest.getReceiver().getId(),
                friendRequest.getReceiver().getNickname(),
                friendRequest.getReceiver().getEmail(),
                friendRequest.getReceiver().getAvatarUrl()
        );
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("Authenticated user is required");
        }
        return user;
    }
}
