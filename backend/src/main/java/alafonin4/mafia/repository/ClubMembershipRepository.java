package alafonin4.mafia.repository;

import alafonin4.mafia.entity.ClubMembership;
import alafonin4.mafia.entity.ClubMembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClubMembershipRepository extends JpaRepository<ClubMembership, Long> {
    List<ClubMembership> findAllByUserIdAndStatus(Long userId, ClubMembershipStatus status);

    List<ClubMembership> findAllByClubId(Long clubId);

    List<ClubMembership> findAllByClubIdAndStatus(Long clubId, ClubMembershipStatus status);

    Optional<ClubMembership> findByClubIdAndUserId(Long clubId, Long userId);

    boolean existsByClubIdAndUserIdAndStatus(Long clubId, Long userId, ClubMembershipStatus status);
}
