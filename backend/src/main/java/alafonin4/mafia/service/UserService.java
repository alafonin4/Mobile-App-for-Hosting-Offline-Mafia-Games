package alafonin4.mafia.service;

import alafonin4.mafia.dto.user.FriendRelation;
import alafonin4.mafia.dto.user.RatingEntryResponse;
import alafonin4.mafia.dto.user.RatingResponse;
import alafonin4.mafia.dto.user.UserRequest;
import alafonin4.mafia.dto.user.UserProfileResponse;
import alafonin4.mafia.dto.user.UserResponse;
import alafonin4.mafia.dto.user.UserSearchResponse;
import alafonin4.mafia.dto.user.UserSummaryResponse;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.service.GameRoleCatalogService;
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
    private final GameRoleCatalogService roleCatalogService;

    public UserResponse getCurrentUser() {
        gameHistoryService.refreshFinishedGameSnapshots();
        return toUserResponse(currentUser());
    }

    public UserProfileResponse getUserProfile(long userId) {
        gameHistoryService.refreshFinishedGameSnapshots();
        User viewer = currentUser();
        User candidate = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        RelationInfo relationInfo = resolveRelation(viewer, candidate);
        return toUserProfileResponse(candidate, relationInfo);
    }

    public UserResponse updateInfoAboutCurrentUser(UserRequest userRequest) {
        gameHistoryService.refreshFinishedGameSnapshots();
        User user = currentUser();
        Set<String> supportedRoleIds = roleCatalogService.supportedRoleIds();

        if (userRequest.nickname() != null && !userRequest.nickname().isBlank()) {
            user.setNickname(userRequest.nickname().trim());
        }
        user.setAvatarUrl(normalizeAvatarUrl(userRequest.avatarUrl()));
        if (userRequest.favoriteRoleIds() != null) {
            user.setFavoriteRoleIds(normalizePreferredRoles(userRequest.favoriteRoleIds(), supportedRoleIds, "Favorite roles"));
        }
        if (userRequest.dislikedRoleIds() != null) {
            user.setDislikedRoleIds(normalizePreferredRoles(userRequest.dislikedRoleIds(), supportedRoleIds, "Disliked roles"));
        }
        ensureNoRoleOverlap(user.getFavoriteRoleIds(), user.getDislikedRoleIds());

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
        RelationInfo relationInfo = resolveRelation(currentUser, candidate);

        return new UserSearchResponse(
                candidate.getId(),
                candidate.getEmail(),
                candidate.getNickname(),
                candidate.getAvatarUrl(),
                candidate.getRating(),
                relationInfo.relation(),
                relationInfo.requestId()
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
                List.copyOf(user.getFavoriteRoleIds()),
                List.copyOf(user.getDislikedRoleIds()),
                user.getRating(),
                user.getGamesPlayed(),
                user.getWins()
        );
    }

    private UserProfileResponse toUserProfileResponse(User user, RelationInfo relationInfo) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getAvatarUrl(),
                List.copyOf(user.getFavoriteRoleIds()),
                List.copyOf(user.getDislikedRoleIds()),
                user.getRating(),
                user.getGamesPlayed(),
                user.getWins(),
                relationInfo.relation(),
                relationInfo.requestId()
        );
    }

    private RelationInfo resolveRelation(User currentUser, User candidate) {
        if (candidate.getId().equals(currentUser.getId())) {
            return new RelationInfo(FriendRelation.SELF, null);
        }

        List<FriendRequest> relations = friendRequestRepository.findAllBetweenUsers(currentUser, candidate);
        if (relations.isEmpty()) {
            return new RelationInfo(FriendRelation.NONE, null);
        }

        FriendRequest latest = relations.get(0);
        if (latest.getStatus() == FriendRequestStatus.ACCEPTED) {
            return new RelationInfo(FriendRelation.FRIEND, latest.getId());
        }
        if (latest.getStatus() == FriendRequestStatus.PENDING) {
            FriendRelation relation = latest.getReceiver().getId().equals(currentUser.getId())
                    ? FriendRelation.INCOMING_REQUEST
                    : FriendRelation.OUTGOING_REQUEST;
            return new RelationInfo(relation, latest.getId());
        }

        return new RelationInfo(FriendRelation.NONE, null);
    }

    private List<String> normalizePreferredRoles(List<String> roleIds, Set<String> supportedRoleIds, String fieldName) {
        List<String> normalized = roleIds.stream()
                .filter(roleId -> roleId != null && !roleId.isBlank())
                .map(String::trim)
                .distinct()
                .toList();

        if (normalized.size() > 3) {
            throw new IllegalArgumentException(fieldName + " can contain at most 3 roles");
        }

        for (String roleId : normalized) {
            if (!supportedRoleIds.contains(roleId)) {
                throw new IllegalArgumentException("Unknown role id: " + roleId);
            }
        }

        return new ArrayList<>(normalized);
    }

    private void ensureNoRoleOverlap(List<String> favoriteRoleIds, List<String> dislikedRoleIds) {
        Set<String> favoriteSet = new HashSet<>(favoriteRoleIds);
        favoriteSet.retainAll(dislikedRoleIds);
        if (!favoriteSet.isEmpty()) {
            throw new IllegalArgumentException("Favorite and disliked roles must be different");
        }
    }

    private User currentUser() {
        return (User) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
    }

    private record RelationInfo(FriendRelation relation, Long requestId) {
    }
}
