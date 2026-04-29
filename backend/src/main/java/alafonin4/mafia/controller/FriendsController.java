package alafonin4.mafia.controller;

import alafonin4.mafia.dto.friend.FriendRequestResponse;
import alafonin4.mafia.dto.friend.SendFriendRequest;
import alafonin4.mafia.service.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/friends")
@RequiredArgsConstructor
public class FriendsController {
    private final FriendService friendRequestService;

    // Sending a friend request to another user
    @PostMapping("/")
    public ResponseEntity<FriendRequestResponse> sendFriendRequest(@RequestBody SendFriendRequest request) {
        FriendRequestResponse savedRequest = friendRequestService.sendFriendRequestToUser(request.receiverId);
        return ResponseEntity.ok(savedRequest);
    }

    // Accepting a friend request from another user
    @PutMapping("/accept/{id}")
    public ResponseEntity<FriendRequestResponse> acceptFriendRequest(@PathVariable("id") Long requestId) {
        FriendRequestResponse acceptedRequest = friendRequestService.acceptFriendRequest(requestId);
        return ResponseEntity.ok(acceptedRequest);
    }

    // Rejecting a friend request from another user
    @PutMapping("/reject/{id}")
    public ResponseEntity<FriendRequestResponse> rejectFriendRequest(@PathVariable("id") Long requestId) {
        FriendRequestResponse rejectedRequest = friendRequestService.rejectFriendRequest(requestId);
        return ResponseEntity.ok(rejectedRequest);
    }

    @PutMapping("/cancel/{id}")
    public ResponseEntity<FriendRequestResponse> cancelFriendRequest(@PathVariable("id") Long requestId) {
        FriendRequestResponse canceledRequest = friendRequestService.cancelFriendRequest(requestId);
        return ResponseEntity.ok(canceledRequest);
    }

    @DeleteMapping("/with/{userId}")
    public ResponseEntity<Void> removeFriend(@PathVariable("userId") Long userId) {
        friendRequestService.removeFriend(userId);
        return ResponseEntity.noContent().build();
    }

    // Getting all accepted friend requests where user is a receiver or a sender
    @GetMapping("/approved")
    public ResponseEntity<List<FriendRequestResponse>> getApprovedFriendRequests() {
        List<FriendRequestResponse> friends = friendRequestService.sentListOfFriends();
        return ResponseEntity.ok(friends);
    }

    // Getting all pending friend requests where user is a sender
    @GetMapping("/sent/pending")
    public ResponseEntity<List<FriendRequestResponse>> getPendingSentFriendRequests() {
        List<FriendRequestResponse> pending = friendRequestService.getPendingSentRequests();
        return ResponseEntity.ok(pending);
    }

    // Getting all pending friend requests where user is a receiver
    @GetMapping("/received/pending")
    public ResponseEntity<List<FriendRequestResponse>> getPendingReceivedFriendRequests() {
        List<FriendRequestResponse> pending = friendRequestService.getPendingReceivedRequests();
        return ResponseEntity.ok(pending);
    }
}
