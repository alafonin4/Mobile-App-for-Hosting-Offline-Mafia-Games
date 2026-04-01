package alafonin4.mafia.controller;

import alafonin4.mafia.dto.user.RatingResponse;
import alafonin4.mafia.dto.user.UserRequest;
import alafonin4.mafia.dto.user.UserResponse;
import alafonin4.mafia.dto.user.UserSearchResponse;
import alafonin4.mafia.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/users/me")
    public UserResponse getMe() {
        return userService.getCurrentUser();
    }

    @PutMapping("/users/update")
    public ResponseEntity<UserResponse> updateCurrentUser(@RequestBody UserRequest userRequest) {
        return ResponseEntity.ok(userService.updateInfoAboutCurrentUser(userRequest));
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<UserSearchResponse>> searchUsers(@RequestParam(value = "query", required = false) String query) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }

    @GetMapping("/rating")
    public ResponseEntity<RatingResponse> getRating(@RequestParam(value = "scope", defaultValue = "all") String scope) {
        return ResponseEntity.ok(userService.getRating(scope));
    }
}
