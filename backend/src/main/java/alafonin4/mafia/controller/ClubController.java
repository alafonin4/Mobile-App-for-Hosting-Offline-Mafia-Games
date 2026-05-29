package alafonin4.mafia.controller;

import alafonin4.mafia.dto.club.ClubCreateRequest;
import alafonin4.mafia.dto.club.ClubDetailResponse;
import alafonin4.mafia.dto.club.ClubSummaryResponse;
import alafonin4.mafia.gamehistory.dto.GameHistoryListItemResponse;
import alafonin4.mafia.service.ClubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubService clubService;

    @GetMapping
    public ResponseEntity<List<ClubSummaryResponse>> getMyClubs() {
        return ResponseEntity.ok(clubService.getCurrentUserClubs());
    }

    @PostMapping
    public ResponseEntity<ClubDetailResponse> createClub(@RequestBody ClubCreateRequest request) {
        return ResponseEntity.ok(clubService.createClub(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClubDetailResponse> getClub(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.getClubDetails(id));
    }

    @PostMapping("/{id}/invite/{userId}")
    public ResponseEntity<ClubDetailResponse> inviteMember(@PathVariable Long id, @PathVariable Long userId) {
        return ResponseEntity.ok(clubService.inviteMember(id, userId));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<GameHistoryListItemResponse>> getClubHistory(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.getClubHistory(id));
    }
}
