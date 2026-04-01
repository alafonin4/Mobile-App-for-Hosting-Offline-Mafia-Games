package alafonin4.mafia.gamehistory.repository;

import alafonin4.mafia.gamehistory.entity.CompletedGameRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompletedGameRecordRepository extends JpaRepository<CompletedGameRecord, Long> {
    Optional<CompletedGameRecord> findByRoomId(UUID roomId);

    @Query("""
            select distinct game
            from CompletedGameRecord game
            join game.participantIds participantId
            where participantId = :userId
            order by game.finishedAt desc
            """)
    List<CompletedGameRecord> findAllForParticipant(@Param("userId") Long userId);
}
