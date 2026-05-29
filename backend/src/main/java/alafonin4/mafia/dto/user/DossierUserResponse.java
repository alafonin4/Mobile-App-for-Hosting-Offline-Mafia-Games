package alafonin4.mafia.dto.user;

public record DossierUserResponse(
        Long id,
        String nickname,
        String avatarUrl,
        FriendRelation relation
) {
}
