package alafonin4.mafia.repository;

import alafonin4.mafia.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    List<User> findTop20ByEmailContainingIgnoreCaseOrNicknameContainingIgnoreCaseOrderByRatingDesc(String emailQuery, String nicknameQuery);
}
