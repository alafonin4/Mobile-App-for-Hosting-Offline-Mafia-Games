package alafonin4.mafia.game.controller;

import alafonin4.mafia.game.dto.CreateRoomRequest;
import alafonin4.mafia.game.dto.DayVoteRequest;
import alafonin4.mafia.game.dto.GameRoomResponse;
import alafonin4.mafia.game.dto.NightActionRequest;
import alafonin4.mafia.game.dto.VoteRoundResponse;
import alafonin4.mafia.game.service.GameService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/game/rooms")
public class GameRoomController {
    private final GameService gameService;

    public GameRoomController(GameService gameService) {
        this.gameService = gameService;
    }

    @PostMapping
    public ResponseEntity<GameRoomResponse> createRoom(@RequestBody CreateRoomRequest request) {
        return ResponseEntity.ok(gameService.createRoom(request));
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<GameRoomResponse> joinRoom(@PathVariable UUID roomId) {
        return ResponseEntity.ok(gameService.joinRoom(roomId));
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<GameRoomResponse> leaveRoom(@PathVariable UUID roomId) {
        return ResponseEntity.ok(gameService.leaveRoom(roomId));
    }

    @PostMapping("/{roomId}/ready")
    public ResponseEntity<GameRoomResponse> toggleReady(@PathVariable UUID roomId) {
        return ResponseEntity.ok(gameService.toggleReady(roomId));
    }

    @PostMapping("/{roomId}/start")
    public ResponseEntity<GameRoomResponse> startGame(@PathVariable UUID roomId) {
        return ResponseEntity.ok(gameService.startGame(roomId));
    }

    @PostMapping("/{roomId}/night-action")
    public ResponseEntity<GameRoomResponse> submitNightAction(@PathVariable UUID roomId, @RequestBody NightActionRequest request) {
        return ResponseEntity.ok(gameService.submitNightAction(roomId, request));
    }

    @PostMapping("/{roomId}/day-vote")
    public ResponseEntity<GameRoomResponse> submitDayVote(@PathVariable UUID roomId, @RequestBody DayVoteRequest request) {
        return ResponseEntity.ok(gameService.submitDayVote(roomId, request));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<GameRoomResponse> getRoomState(@PathVariable UUID roomId) {
        return ResponseEntity.ok(gameService.getRoomState(roomId));
    }

    @GetMapping("/{roomId}/votes")
    public ResponseEntity<List<VoteRoundResponse>> getVoteHistory(@PathVariable UUID roomId) {
        return ResponseEntity.ok(gameService.getVoteHistory(roomId));
    }

    @GetMapping("/{roomId}/votes/{roundId}")
    public ResponseEntity<VoteRoundResponse> getVoteRound(@PathVariable UUID roomId, @PathVariable UUID roundId) {
        return ResponseEntity.ok(gameService.getVoteRound(roomId, roundId));
    }
}
