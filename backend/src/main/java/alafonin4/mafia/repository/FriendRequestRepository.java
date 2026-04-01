package alafonin4.mafia.repository;

import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findAllBySenderAndStatus(User sender, FriendRequestStatus status);

    List<FriendRequest> findAllByReceiverAndStatus(User receiver, FriendRequestStatus status);

    @Query("""
            select fr
            from FriendRequest fr
            where fr.status = :status
              and (fr.sender = :user or fr.receiver = :user)
            """)
    List<FriendRequest> findAllByUserAndStatus(@Param("user") User user, @Param("status") FriendRequestStatus status);

    @Query("""
            select fr
            from FriendRequest fr
            where (fr.sender = :first and fr.receiver = :second)
               or (fr.sender = :second and fr.receiver = :first)
            order by fr.id desc
            """)
    List<FriendRequest> findAllBetweenUsers(@Param("first") User first, @Param("second") User second);
}
