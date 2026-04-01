package alafonin4.mafia.game.controller;

import alafonin4.mafia.game.dto.RoleCatalogItemResponse;
import alafonin4.mafia.game.service.GameRoleCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/game/roles")
public class RoleCatalogController {
    private final GameRoleCatalogService roleCatalogService;

    public RoleCatalogController(GameRoleCatalogService roleCatalogService) {
        this.roleCatalogService = roleCatalogService;
    }

    @GetMapping("/mafia")
    public ResponseEntity<List<RoleCatalogItemResponse>> getMafiaRoles() {
        return ResponseEntity.ok(roleCatalogService.mafiaRoles());
    }

    @GetMapping("/town")
    public ResponseEntity<List<RoleCatalogItemResponse>> getTownRoles() {
        return ResponseEntity.ok(roleCatalogService.townRoles());
    }
}
