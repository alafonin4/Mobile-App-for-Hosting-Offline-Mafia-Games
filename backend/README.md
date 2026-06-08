# Mafia Backend

Spring Boot backend for the Mafia Mobile app. It provides authentication, user profiles, friends, private clubs, notifications, game-room lifecycle, WebSocket game events, completed-game history, Signature Recaps, and Player Dossier analytics.

## Requirements

- Java 17
- Maven
- PostgreSQL

The Maven wrapper is included, so you can use `mvnw` / `mvnw.cmd` if Maven is not installed globally.

## Configuration

Runtime configuration is in `src/main/resources/application.properties`.

Required database environment variables:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/mafia
SPRING_DATASOURCE_USERNAME=<your_username>
SPRING_DATASOURCE_PASSWORD=<your_password>
JWT_SECRET=<at_least_32_bytes_random_secret>
```

Optional:

```bash
PORT=8080
JWT_ACCESS_TOKEN_TTL_MINUTES=100
REFRESH_TOKEN_TTL_DAYS=30
REFRESH_TOKEN_GAME_GRACE_HOURS=12
ALLOWED_ORIGINS=http://localhost:*,http://192.168.*:*
```

The server binds to `0.0.0.0`, which allows a physical phone on the same Wi-Fi network to reach the backend through the laptop IP address.

Create the database if needed:

```sql
CREATE DATABASE mafia;
```

## Run

```bash
mvn spring-boot:run
```

Or with the wrapper on Windows:

```bash
mvnw.cmd spring-boot:run
```

Default local URL:

```text
http://localhost:8080
```

## Test

```bash
mvn test
```

Tests use H2 where appropriate and cover core services such as auth, friends, clubs, game service, users, and history.

## Architecture

```text
controller/          REST controllers and exception handling
service/             Auth, users, friends, notifications, clubs
game/                Active room domain, role catalog, game service, WebSocket
gamehistory/         Completed-game snapshots, archive, recaps, dossiers
security/            JWT filter, JWT service, Spring Security config
repository/          Spring Data repositories
entity/              JPA entities
config/              logging, Jackson, small schema compatibility migration
```

Active rooms live in an in-memory `GameRoomStore`. Completed games are persisted to PostgreSQL as snapshots, then reused for history, recaps, and dossiers.

## Main REST Areas

Authentication:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Users, rating, dossiers:

- `GET /users/me`
- `PUT /users/update`
- `GET /users/search`
- `GET /users/{id}`
- `GET /users/nickname-availability`
- `GET /users/me/dossier`
- `GET /users/{id}/dossier`
- `GET /rating`

Friends:

- `POST /friends/`
- `PUT /friends/accept/{id}`
- `PUT /friends/reject/{id}`
- `PUT /friends/cancel/{id}`
- `DELETE /friends/with/{userId}`
- `GET /friends/approved`
- `GET /friends/sent/pending`
- `GET /friends/received/pending`

Private Clubs:

- `GET /clubs`
- `POST /clubs`
- `GET /clubs/{id}`
- `POST /clubs/{id}/invite/{userId}`
- `GET /clubs/{id}/history`

Notifications:

- `GET /notifications`
- `PUT /notifications/read-all`
- `POST /notifications/{notificationId}/join-game`
- `POST /notifications/{notificationId}/join-club`

Roles and game rooms:

- `GET /game/roles/mafia`
- `GET /game/roles/town`
- `POST /game/rooms/`
- `POST /game/rooms/{roomId}/join`
- `POST /game/rooms/{roomId}/invite/{friendId}`
- `POST /game/rooms/{roomId}/leave`
- `POST /game/rooms/{roomId}/ready`
- `POST /game/rooms/{roomId}/start`
- `POST /game/rooms/{roomId}/night-action`
- `POST /game/rooms/{roomId}/day-vote`
- `POST /game/rooms/{roomId}/phase/day`
- `POST /game/rooms/{roomId}/phase/voting`
- `POST /game/rooms/{roomId}/phase/night`
- `POST /game/rooms/{roomId}/discussion-queue`
- `GET /game/rooms/{roomId}`
- `GET /game/rooms/{roomId}/votes`
- `GET /game/rooms/{roomId}/votes/{roundId}`

History:

- `GET /games/history`
- `GET /games/history/{id}`
- `GET /games/history/room/{roomId}`

## WebSocket

SockJS/STOMP endpoint:

```text
/ws-game
```

Clients authenticate the STOMP `CONNECT` frame with:

```text
Authorization: Bearer <jwt>
```

Subscriptions to `/topic/game/{roomId}` are limited to room participants.

Broker destinations:

```text
/topic/game/{roomId}
/user/queue/game
```

Published event examples:

- `ROOM_STATE_UPDATED`
- `ROLE_ASSIGNED`

## Analytics

Signature Recaps and Player Dossiers are computed at read time from completed game snapshots:

- `playersJson`
- `voteHistoryJson`
- participant ids
- host metadata
- winner
- day and night counts
- club metadata

No separate analytics tables are required for the current version.

## Logging

Request logging uses a request id in the logging MDC.

Log file:

```text
logs/mafia-backend.log
```

Rolling policy:

- max file size: `10MB`
- max history: `14`
- total cap: `100MB`

## Database Notes

`spring.jpa.hibernate.ddl-auto=update` is enabled for development convenience.

The app includes a small startup compatibility migration for the user avatar URL column so large image/data URLs do not overflow the old `varchar(255)` schema.

## Security Notes

- Spring Security protects all routes except `/auth/**` and `/ws-game/**`.
- Access tokens are JWTs.
- Refresh tokens are persisted server-side as hashes and rotated on refresh.
- Recently expired refresh tokens may be rotated during an unfinished active game for a limited grace window configured by `REFRESH_TOKEN_GAME_GRACE_HOURS`.
- Passwords are hashed with BCrypt.
- WebSocket authentication is handled during STOMP `CONNECT`; tokens are not sent in the URL.

Before using the backend as a real public production service, externalize the JWT signing key and review CORS, database credentials, logging retention, and deployment secrets.
