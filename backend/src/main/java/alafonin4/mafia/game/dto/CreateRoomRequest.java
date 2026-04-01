package alafonin4.mafia.game.dto;

import java.util.List;

public record CreateRoomRequest(String name, List<RoleSlotRequest> roles) {
}
