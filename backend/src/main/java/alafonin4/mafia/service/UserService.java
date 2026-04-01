package alafonin4.mafia.service;

import alafonin4.mafia.dto.user.FriendRelation;
import alafonin4.mafia.dto.user.RatingEntryResponse;
import alafonin4.mafia.dto.user.RatingResponse;
import alafonin4.mafia.dto.user.UserRequest;
import alafonin4.mafia.dto.user.UserResponse;
import alafonin4.mafia.dto.user.UserSearchResponse;
import alafonin4.mafia.dto.user.UserSummaryResponse;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.gamehistory.service.GameHistoryService;
import alafonin4.mafia.repository.FriendRequestRepository;
import alafonin4.mafia.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final GameHistoryService gameHistoryService;

    public UserResponse getCurrentUser() {
        gameHistoryService.refreshFinishedGameSnapshots();
        return toUserResponse(currentUser());
    }

    public UserResponse updateInfoAboutCurrentUser(UserRequest userRequest) {
        gameHistoryService.refreshFinishedGameSnapshots();
        User user = currentUser();

        if (userRequest.nickname() != null && !userRequest.nickname().isBlank()) {
            user.setNickname(userRequest.nickname().trim());
        }
        user.setAvatarUrl(normalizeAvatarUrl(userRequest.avatarUrl()));

        return toUserResponse(userRepository.save(user));
    }

    public List<UserSearchResponse> searchUsers(String query) {
        gameHistoryService.refreshFinishedGameSnapshots();
        User currentUser = currentUser();
        String normalizedQuery = query == null ? "" : query.trim();
        List<User> candidates = normalizedQuery.isBlank()
                ? userRepository.findAll().stream()
                .sorted(Comparator.comparingInt(User::getRating).reversed().thenComparing(User::getId))
                .limit(20)
                .toList()
                : userRepository.findTop20ByEmailContainingIgnoreCaseOrNicknameContainingIgnoreCaseOrderByRatingDesc(normalizedQuery, normalizedQuery);

        return candidates.stream()
                .map(candidate -> toSearchResponse(candidate, currentUser))
                .toList();
    }

    public RatingResponse getRating(String scope) {
        gameHistoryService.refreshFinishedGameSnapshots();
        User currentUser = currentUser();
        boolean friendsOnly = "friends".equalsIgnoreCase(scope);
        List<User> users = friendsOnly ? friendUsersIncludingCurrent(currentUser) : userRepository.findAll();
        List<User> sortedUsers = users.stream()
                .distinct()
                .sorted(Comparator.comparingInt(User::getRating).reversed()
                        .thenComparingInt(User::getWins).reversed()
                        .thenComparing(User::getNickname, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(User::getId))
                .toList();

        List<RatingEntryResponse> entries = new ArrayList<>();
        Integer currentUserRank = null;
        for (int index = 0; index < sortedUsers.size(); index++) {
            User user = sortedUsers.get(index);
            int rank = index + 1;
            boolean isCurrentUser = user.getId().equals(currentUser.getId());
            if (isCurrentUser) {
                currentUserRank = rank;
            }
            entries.add(new RatingEntryResponse(
                    rank,
                    user.getId(),
                    user.getEmail(),
                    user.getNickname(),
                    user.getAvatarUrl(),
                    user.getRating(),
                    user.getGamesPlayed(),
                    user.getWins(),
                    isCurrentUser
            ));
        }

        return new RatingResponse(
                friendsOnly ? "friends" : "all",
                currentUserRank,
                toUserSummary(currentUser),
                entries
        );
    }

    private List<User> friendUsersIncludingCurrent(User currentUser) {
        Set<Long> friendIds = new HashSet<>();
        for (FriendRequest request : friendRequestRepository.findAllByUserAndStatus(currentUser, FriendRequestStatus.ACCEPTED)) {
            Long friendId = request.getSender().getId().equals(currentUser.getId())
                    ? request.getReceiver().getId()
                    : request.getSender().getId();
            friendIds.add(friendId);
        }
        friendIds.add(currentUser.getId());
        return userRepository.findAllById(friendIds);
    }

    private UserSearchResponse toSearchResponse(User candidate, User currentUser) {
        FriendRelation relation = FriendRelation.NONE;
        Long requestId = null;

        if (candidate.getId().equals(currentUser.getId())) {
            relation = FriendRelation.SELF;
        } else {
            List<FriendRequest> relations = friendRequestRepository.findAllBetweenUsers(currentUser, candidate);
            if (!relations.isEmpty()) {
                FriendRequest latest = relations.get(0);
                requestId = latest.getId();
                if (latest.getStatus() == FriendRequestStatus.ACCEPTED) {
                    relation = FriendRelation.FRIEND;
                } else if (latest.getStatus() == FriendRequestStatus.PENDING) {
                    relation = latest.getReceiver().getId().equals(currentUser.getId())
                            ? FriendRelation.INCOMING_REQUEST
                            : FriendRelation.OUTGOING_REQUEST;
                }
            }
        }

        return new UserSearchResponse(
                candidate.getId(),
                candidate.getEmail(),
                candidate.getNickname(),
                candidate.getAvatarUrl(),
                candidate.getRating(),
                relation,
                requestId
        );
    }

    private String normalizeAvatarUrl(String avatarUrl) {
        if (avatarUrl == null) {
            return null;
        }
        String trimmed = avatarUrl.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private UserSummaryResponse toUserSummary(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getRating(),
                user.getGamesPlayed(),
                user.getWins()
        );
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getRating(),
                user.getGamesPlayed(),
                user.getWins()
        );
    }

    private User currentUser() {
        return (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
    }
}
