package alafonin4.mafia.repository;

import alafonin4.mafia.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByNicknameIgnoreCase(String nickname);
    boolean existsByNicknameIgnoreCaseAndIdNot(String nickname, Long id);

    List<User> findTop20ByEmailContainingIgnoreCaseOrNicknameContainingIgnoreCaseOrderByRatingDesc(String emailQuery, String nicknameQuery);
}
