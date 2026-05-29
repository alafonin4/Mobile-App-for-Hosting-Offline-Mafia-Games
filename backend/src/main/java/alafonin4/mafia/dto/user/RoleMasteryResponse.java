package alafonin4.mafia.dto.user;

public record RoleMasteryResponse(
        String roleId,
        String roleName,
        int playCount,
        double winRate
) {
}
