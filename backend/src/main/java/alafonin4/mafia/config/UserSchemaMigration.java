package alafonin4.mafia.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserSchemaMigration {

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureUserProfileColumns() {
        try (Connection connection = dataSource.getConnection()) {
            String databaseProductName = connection.getMetaData().getDatabaseProductName();
            if (!"PostgreSQL".equalsIgnoreCase(databaseProductName)) {
                return;
            }

            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(16) NOT NULL DEFAULT 'EN'");
            log.info("Ensured users profile columns are aligned");
        } catch (Exception exception) {
            log.warn("Could not align users profile columns automatically", exception);
        }
    }
}
