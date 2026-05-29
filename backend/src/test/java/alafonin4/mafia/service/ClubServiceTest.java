package alafonin4.mafia.service;

import alafonin4.mafia.dto.club.ClubCreateRequest;
import alafonin4.mafia.dto.club.ClubDetailResponse;
import alafonin4.mafia.dto.club.ClubSummaryResponse;
import alafonin4.mafia.entity.ClubMembership;
import alafonin4.mafia.entity.ClubMembershipStatus;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.entity.UserNotification;
import alafonin4.mafia.entity.UserNotificationType;
import alafonin4.mafia.repository.ClubMembershipRepository;
import alafonin4.mafia.repository.FriendRequestRepository;
import alafonin4.mafia.repository.UserNotificationRepository;
import alafonin4.mafia.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class ClubServiceTest {

    @Autowired
    private ClubService clubService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private UserNotificationRepository userNotificationRepository;

    @Autowired
    private ClubMembershipRepository clubMembershipRepository;

    @Test
    void createClubAddsOwnerMembershipAndAppearsInCurrentUserList() {
        User owner = createUser("club-owner@example.com");
        setCurrentUser(owner);

        ClubDetailResponse createdClub = clubService.createClub(new ClubCreateRequest("Dorm Circle", "Weekly tables in the residence hall"));
        List<ClubSummaryResponse> clubs = clubService.getCurrentUserClubs();

        assertEquals("Dorm Circle", createdClub.name());
        assertEquals(1, createdClub.memberCount());
        assertEquals(1, clubs.size());
        assertEquals(createdClub.id(), clubs.get(0).id());
        assertEquals("Dorm Circle", clubs.get(0).name());
    }

    @Test
    void inviteMemberCreatesNotificationAndAcceptActivatesMembership() {
        User owner = createUser("club-host@example.com");
        User invited = createUser("club-guest@example.com");
        friendRequestRepository.save(FriendRequest.builder()
                .sender(owner)
                .receiver(invited)
                .status(FriendRequestStatus.ACCEPTED)
                .build());

        setCurrentUser(owner);
        ClubDetailResponse club = clubService.createClub(new ClubCreateRequest("Housing Company", "Tables for the apartment crew"));
        clubService.inviteMember(club.id(), invited.getId());

        UserNotification notification = userNotificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(invited.getId()).stream()
                .filter(item -> item.getType() == UserNotificationType.CLUB_INVITE)
                .findFirst()
                .orElseThrow();

        ClubMembership pendingMembership = clubMembershipRepository.findByClubIdAndUserId(club.id(), invited.getId()).orElseThrow();
        assertEquals(ClubMembershipStatus.INVITED, pendingMembership.getStatus());

        setCurrentUser(invited);
        ClubDetailResponse acceptedClub = clubService.acceptClubInvite(notification.getId());

        ClubMembership activeMembership = clubMembershipRepository.findByClubIdAndUserId(club.id(), invited.getId()).orElseThrow();
        assertEquals(ClubMembershipStatus.ACTIVE, activeMembership.getStatus());
        assertEquals(2, acceptedClub.memberCount());
        assertTrue(acceptedClub.members().stream().anyMatch(member -> member.userId().equals(invited.getId()) && member.status() == ClubMembershipStatus.ACTIVE));
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
