package alafonin4.mafia.service;

import alafonin4.mafia.dto.club.ClubCreateRequest;
import alafonin4.mafia.dto.club.ClubDetailResponse;
import alafonin4.mafia.dto.club.ClubMemberResponse;
import alafonin4.mafia.dto.club.ClubSummaryResponse;
import alafonin4.mafia.entity.ClubMembership;
import alafonin4.mafia.entity.ClubMembershipRole;
import alafonin4.mafia.entity.ClubMembershipStatus;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.PrivateClub;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.entity.UserNotification;
import alafonin4.mafia.entity.UserNotificationType;
import alafonin4.mafia.gamehistory.dto.GameHistoryListItemResponse;
import alafonin4.mafia.gamehistory.repository.CompletedGameRecordRepository;
import alafonin4.mafia.repository.ClubMembershipRepository;
import alafonin4.mafia.repository.FriendRequestRepository;
import alafonin4.mafia.repository.PrivateClubRepository;
import alafonin4.mafia.repository.UserNotificationRepository;
import alafonin4.mafia.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClubService {
    private static final int MAX_CLUB_NAME_LENGTH = 60;
    private static final int MAX_CLUB_DESCRIPTION_LENGTH = 500;

    private final PrivateClubRepository privateClubRepository;
    private final ClubMembershipRepository clubMembershipRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final CompletedGameRecordRepository completedGameRecordRepository;

    @Transactional
    public ClubDetailResponse createClub(ClubCreateRequest request) {
        User currentUser = currentUser();
        String clubName = normalizeClubName(request.name());
        String description = normalizeDescription(request.description());

        PrivateClub club = new PrivateClub();
        club.setName(clubName);
        club.setDescription(description);
        club.setCreatedBy(currentUser);
        club = privateClubRepository.save(club);

        ClubMembership ownerMembership = new ClubMembership();
        ownerMembership.setClub(club);
        ownerMembership.setUser(currentUser);
        ownerMembership.setRole(ClubMembershipRole.OWNER);
        ownerMembership.setStatus(ClubMembershipStatus.ACTIVE);
        ownerMembership.setJoinedAt(LocalDateTime.now());
        clubMembershipRepository.save(ownerMembership);

        return getClubDetails(club.getId());
    }

    @Transactional
    public List<ClubSummaryResponse> getCurrentUserClubs() {
        return clubMembershipRepository.findAllByUserIdAndStatus(currentUser().getId(), ClubMembershipStatus.ACTIVE).stream()
                .sorted(Comparator.comparing((ClubMembership membership) -> membership.getClub().getCreatedAt()).reversed())
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public ClubDetailResponse getClubDetails(Long clubId) {
        ClubMembership membership = requireActiveMembership(clubId, currentUser().getId());
        return toDetail(membership.getClub(), membership.getRole());
    }

    @Transactional
    public ClubDetailResponse inviteMember(Long clubId, Long invitedUserId) {
        User currentUser = currentUser();
        ClubMembership ownerMembership = requireActiveMembership(clubId, currentUser.getId());
        if (ownerMembership.getRole() != ClubMembershipRole.OWNER) {
            throw new IllegalStateException("Only the club owner can invite new members");
        }
        if (currentUser.getId().equals(invitedUserId)) {
            throw new IllegalArgumentException("You cannot invite yourself");
        }

        User invitedUser = userRepository.findById(invitedUserId)
                .orElseThrow(() -> new IllegalArgumentException("Invited user not found"));
        ensureFriendship(currentUser, invitedUser);

        ClubMembership membership = clubMembershipRepository.findByClubIdAndUserId(clubId, invitedUserId)
                .orElse(null);

        if (membership != null && membership.getStatus() == ClubMembershipStatus.ACTIVE) {
            return toDetail(ownerMembership.getClub(), ownerMembership.getRole());
        }

        if (membership == null) {
            membership = new ClubMembership();
            membership.setClub(ownerMembership.getClub());
            membership.setUser(invitedUser);
            membership.setRole(ClubMembershipRole.MEMBER);
        }
        membership.setStatus(ClubMembershipStatus.INVITED);
        membership.setJoinedAt(null);
        clubMembershipRepository.save(membership);

        createClubInviteNotification(ownerMembership.getClub(), currentUser, invitedUser);
        return toDetail(ownerMembership.getClub(), ownerMembership.getRole());
    }

    @Transactional
    public ClubDetailResponse acceptClubInvite(Long notificationId) {
        User currentUser = currentUser();
        UserNotification notification = userNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getRecipient().getId().equals(currentUser.getId())) {
            throw new IllegalStateException("Notification does not belong to current user");
        }
        if (notification.getType() != UserNotificationType.CLUB_INVITE || !notification.isActive() || notification.getClubId() == null) {
            throw new IllegalStateException("Club invitation is no longer active");
        }

        ClubMembership membership = clubMembershipRepository.findByClubIdAndUserId(notification.getClubId(), currentUser.getId())
                .orElseThrow(() -> new IllegalStateException("Club membership invite not found"));

        membership.setStatus(ClubMembershipStatus.ACTIVE);
        membership.setJoinedAt(LocalDateTime.now());
        clubMembershipRepository.save(membership);

        notification.setActive(false);
        notification.setRead(true);
        userNotificationRepository.save(notification);

        return toDetail(membership.getClub(), membership.getRole());
    }

    @Transactional
    public List<GameHistoryListItemResponse> getClubHistory(Long clubId) {
        requireActiveMembership(clubId, currentUser().getId());
        return completedGameRecordRepository.findAllByClubIdOrderByFinishedAtDesc(clubId).stream()
                .map(record -> new GameHistoryListItemResponse(
                        record.getId(),
                        record.getRoomId(),
                        record.getRoomName(),
                        record.getWinner(),
                        record.getWinnerUserId(),
                        record.getFinishedAt(),
                        record.getNightNumber(),
                        record.getDayNumber(),
                        record.getParticipantCount(),
                        record.getClubId(),
                        record.getClubName()
                ))
                .toList();
    }

    public PrivateClub requireClubForRoomCreation(Long clubId, Long userId) {
        if (clubId == null) {
            return null;
        }
        return requireActiveMembership(clubId, userId).getClub();
    }

    private void ensureFriendship(User currentUser, User invitedUser) {
        boolean isFriend = friendRequestRepository.findAllBetweenUsers(currentUser, invitedUser).stream()
                .anyMatch(request -> request.getStatus() == FriendRequestStatus.ACCEPTED);
        if (!isFriend) {
            throw new IllegalStateException("You can invite only approved friends");
        }
    }

    private void createClubInviteNotification(PrivateClub club, User sender, User recipient) {
        UserNotification notification = new UserNotification();
        notification.setRecipient(recipient);
        notification.setType(UserNotificationType.CLUB_INVITE);
        notification.setTitle("Club invitation");
        notification.setMessage(sender.getNickname() + " invited you to join club " + club.getName() + ".");
        notification.setRead(false);
        notification.setActive(true);
        notification.setRelatedUserId(sender.getId());
        notification.setRelatedUserName(sender.getNickname());
        notification.setClubId(club.getId());
        notification.setClubName(club.getName());
        userNotificationRepository.save(notification);
    }

    private ClubMembership requireActiveMembership(Long clubId, Long userId) {
        ClubMembership membership = clubMembershipRepository.findByClubIdAndUserId(clubId, userId)
                .orElseThrow(() -> new IllegalStateException("Club membership not found"));
        if (membership.getStatus() != ClubMembershipStatus.ACTIVE) {
            throw new IllegalStateException("Club membership is not active");
        }
        return membership;
    }

    private ClubSummaryResponse toSummary(ClubMembership membership) {
        PrivateClub club = membership.getClub();
        int memberCount = clubMembershipRepository.findAllByClubIdAndStatus(club.getId(), ClubMembershipStatus.ACTIVE).size();
        return new ClubSummaryResponse(
                club.getId(),
                club.getName(),
                club.getDescription(),
                memberCount,
                membership.getRole(),
                club.getCreatedAt()
        );
    }

    private ClubDetailResponse toDetail(PrivateClub club, ClubMembershipRole viewerRole) {
        List<ClubMembership> memberships = clubMembershipRepository.findAllByClubId(club.getId()).stream()
                .sorted(Comparator
                        .comparing(ClubMembership::getStatus)
                        .thenComparing(ClubMembership::getRole)
                        .thenComparing(membership -> membership.getUser().getNickname(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<ClubMemberResponse> members = memberships.stream()
                .map(membership -> new ClubMemberResponse(
                        membership.getUser().getId(),
                        membership.getUser().getNickname(),
                        membership.getUser().getEmail(),
                        membership.getUser().getAvatarUrl(),
                        membership.getRole(),
                        membership.getStatus()
                ))
                .toList();

        int memberCount = (int) memberships.stream()
                .filter(membership -> membership.getStatus() == ClubMembershipStatus.ACTIVE)
                .count();

        return new ClubDetailResponse(
                club.getId(),
                club.getName(),
                club.getDescription(),
                memberCount,
                viewerRole,
                club.getCreatedAt(),
                members
        );
    }

    private String normalizeClubName(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Club name is required");
        }
        String trimmed = value.trim();
        if (trimmed.length() < 3) {
            throw new IllegalArgumentException("Club name is too short");
        }
        if (trimmed.length() > MAX_CLUB_NAME_LENGTH) {
            throw new IllegalArgumentException("Club name is too long");
        }
        return trimmed;
    }

    private String normalizeDescription(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > MAX_CLUB_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("Club description is too long");
        }
        return trimmed;
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("Authenticated user is required");
        }
        return user;
    }
}
