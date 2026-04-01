package alafonin4.mafia.game.store;

import alafonin4.mafia.game.domain.GameRoom;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameRoomStore {
    private final Map<UUID, GameRoom> rooms = new ConcurrentHashMap<>();

    public GameRoom save(GameRoom room) {
        rooms.put(room.getId(), room);
        return room;
    }

    public Optional<GameRoom> findById(UUID roomId) {
        return Optional.ofNullable(rooms.get(roomId));
    }

    public Map<UUID, GameRoom> findAll() {
        return Map.copyOf(rooms);
    }

    public void delete(UUID roomId) {
        rooms.remove(roomId);
    }
}
