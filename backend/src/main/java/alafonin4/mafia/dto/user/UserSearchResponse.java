package alafonin4.mafia.dto.user;

public record UserSearchResponse(
        Long id,
        String email,
        String nickname,
        String avatarUrl,
        int rating,
        FriendRelation relation,
        Long requestId
) {
}
