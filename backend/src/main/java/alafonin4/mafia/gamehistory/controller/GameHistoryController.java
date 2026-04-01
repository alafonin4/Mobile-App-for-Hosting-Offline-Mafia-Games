package alafonin4.mafia.gamehistory.controller;

import alafonin4.mafia.gamehistory.dto.GameHistoryDetailResponse;
import alafonin4.mafia.gamehistory.dto.GameHistoryListItemResponse;
import alafonin4.mafia.gamehistory.service.GameHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/games/history")
public class GameHistoryController {
    private final GameHistoryService gameHistoryService;

    public GameHistoryController(GameHistoryService gameHistoryService) {
        this.gameHistoryService = gameHistoryService;
    }

    @GetMapping
    public ResponseEntity<List<GameHistoryListItemResponse>> getHistory() {
        return ResponseEntity.ok(gameHistoryService.getHistoryForCurrentUser());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameHistoryDetailResponse> getHistoryDetails(@PathVariable Long id) {
        return ResponseEntity.ok(gameHistoryService.getHistoryDetails(id));
    }
}
