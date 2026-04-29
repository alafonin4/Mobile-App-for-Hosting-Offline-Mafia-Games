package alafonin4.mafia.service;

import alafonin4.mafia.dto.notification.NotificationResponse;
import alafonin4.mafia.entity.FriendRequest;
import alafonin4.mafia.entity.FriendRequestStatus;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.entity.UserNotification;
import alafonin4.mafia.entity.UserNotificationType;
import alafonin4.mafia.game.domain.GamePhase;
import alafonin4.mafia.game.domain.GamePlayer;
import alafonin4.mafia.game.domain.GameRoom;
import alafonin4.mafia.game.dto.GameRoomResponse;
import alafonin4.mafia.game.service.GameEventPublisher;
import alafonin4.mafia.game.service.GameMapper;
import alafonin4.mafia.game.store.GameRoomStore;
import alafonin4.mafia.repository.FriendRequestRepository;
import alafonin4.mafia.repository.UserNotificationRepository;
import alafonin4.mafia.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {
    private final UserNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final GameRoomStore roomStore;
    private final GameMapper gameMapper;
    private final GameEventPublisher eventPublisher;

    public NotificationService(UserNotificationRepository notificationRepository, UserRepository userRepository,
                               FriendRequestRepository friendRequestRepository, GameRoomStore roomStore,
                               GameMapper gameMapper, GameEventPublisher eventPublisher) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.friendRequestRepository = friendRequestRepository;
        this.roomStore = roomStore;
        this.gameMapper = gameMapper;
        this.eventPublisher = eventPublisher;
    }

    public void createFriendRequestReceivedNotification(FriendRequest friendRequest) {
        createNotification(
                friendRequest.getReceiver(),
                UserNotificationType.FRIEND_REQUEST_RECEIVED,
                "New friend request",
                friendRequest.getSender().getNickname() + " sent you a friend request.",
                friendRequest.getSender().getId(),
                friendRequest.getSender().getNickname(),
                null,
                null
        );
    }

    public void createFriendRequestAcceptedNotification(FriendRequest friendRequest) {
        createNotification(
                friendRequest.getSender(),
                UserNotificationType.FRIEND_REQUEST_ACCEPTED,
                "Friend request accepted",
                friendRequest.getReceiver().getNickname() + " accepted your friend request.",
                friendRequest.getReceiver().getId(),
                friendRequest.getReceiver().getNickname(),
                null,
                null
        );
    }

    @Transactional
    public GameRoomResponse inviteFriendToRoom(UUID roomId, Long invitedUserId) {
        User host = currentUser();
        User invitedUser = userRepository.findById(invitedUserId)
                .orElseThrow(() -> new IllegalArgumentException("Invited user not found"));
        GameRoom room = roomStore.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        synchronized (room) {
            if (!room.getHostId().equals(host.getId())) {
                throw new IllegalStateException("Only the host can invite friends");
            }
            if (room.getPhase() != GamePhase.LOBBY) {
                throw new IllegalStateException("Invitations are available only while the room is in lobby");
            }
            if (host.getId().equals(invitedUserId)) {
                throw new IllegalArgumentException("You cannot invite yourself");
            }
            if (room.getPlayers().containsKey(invitedUserId)) {
                return broadcastRoomState(room, host.getId());
            }
            if (room.getInvitedUserIds().contains(invitedUserId)) {
                return broadcastRoomState(room, host.getId());
            }

            ensureFriendship(host, invitedUser);

            room.getInvitedUserIds().add(invitedUserId);
            createNotification(
                    invitedUser,
                    UserNotificationType.GAME_INVITE,
                    "Game invitation",
                    host.getNickname() + " invited you to lobby " + room.getName() + ".",
                    host.getId(),
                    host.getNickname(),
                    room.getId(),
                    room.getName()
            );
            return broadcastRoomState(room, host.getId());
        }
    }

    @Transactional
    public void invalidateRoomInvites(UUID roomId) {
        notificationRepository.deactivateActiveRoomNotifications(UserNotificationType.GAME_INVITE, roomId);
    }

    @Transactional
    public void deactivateInviteForRecipient(UUID roomId, Long recipientId) {
        notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(recipientId).stream()
                .filter(notification -> notification.getType() == UserNotificationType.GAME_INVITE)
                .filter(UserNotification::isActive)
                .filter(notification -> roomId.equals(notification.getRoomId()))
                .forEach(notification -> {
                    notification.setActive(false);
                    notification.setRead(true);
                    notificationRepository.save(notification);
                });
    }

    @Transactional
    public GameRoomResponse acceptGameInvite(Long notificationId) {
        User user = currentUser();
        UserNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getRecipient().getId().equals(user.getId())) {
            throw new IllegalStateException("Notification does not belong to current user");
        }
        if (notification.getType() != UserNotificationType.GAME_INVITE || !notification.isActive() || notification.getRoomId() == null) {
            throw new IllegalStateException("Game invite is no longer active");
        }

        GameRoom room = roomStore.findById(notification.getRoomId())
                .orElseThrow(() -> new IllegalStateException("Room not found"));

        synchronized (room) {
            if (room.getPhase() != GamePhase.LOBBY) {
                notification.setActive(false);
                notification.setRead(true);
                notificationRepository.save(notification);
                throw new IllegalStateException("Invitation is no longer active");
            }
            if (room.getPlayers().containsKey(user.getId())) {
                notification.setActive(false);
                notification.setRead(true);
                notificationRepository.save(notification);
                return broadcastRoomState(room, user.getId());
            }
            if (room.getPlayers().size() >= room.getConfiguredRoles().size() + 1) {
                notification.setActive(false);
                notification.setRead(true);
                notificationRepository.save(notification);
                throw new IllegalStateException("Room is already full");
            }

            room.getPlayers().put(user.getId(), new GamePlayer(user.getId(), user.getEmail(), false));
            room.getInvitedUserIds().remove(user.getId());
            notification.setActive(false);
            notification.setRead(true);
            notificationRepository.save(notification);
            return broadcastRoomState(room, user.getId());
        }
    }

    public List<NotificationResponse> getCurrentUserNotifications() {
        return notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(currentUser().getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void markAllRead() {
        notificationRepository.markAllReadForRecipient(currentUser().getId());
    }

    private void ensureFriendship(User host, User invitedUser) {
        boolean friends = friendRequestRepository.findAllBetweenUsers(host, invitedUser).stream()
                .anyMatch(request -> request.getStatus() == FriendRequestStatus.ACCEPTED);
        if (!friends) {
            throw new IllegalStateException("You can invite only approved friends");
        }
    }

    private void createNotification(User recipient, UserNotificationType type, String title, String message,
                                    Long relatedUserId, String relatedUserName, UUID roomId, String roomName) {
        UserNotification notification = new UserNotification();
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);
        notification.setActive(true);
        notification.setRelatedUserId(relatedUserId);
        notification.setRelatedUserName(relatedUserName);
        notification.setRoomId(roomId);
        notification.setRoomName(roomName);
        notificationRepository.save(notification);
    }

    private NotificationResponse toResponse(UserNotification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.isActive(),
                notification.getCreatedAt(),
                notification.getRelatedUserId(),
                notification.getRelatedUserName(),
                notification.getRoomId(),
                notification.getRoomName()
        );
    }

    private GameRoomResponse broadcastRoomState(GameRoom room, Long viewerId) {
        GameRoomResponse response = gameMapper.toRoomResponse(room, viewerId, requiredNightActionCount(room));
        eventPublisher.broadcastRoomState(room.getId(), response);
        return response;
    }

    private int requiredNightActionCount(GameRoom room) {
        return (int) room.getPlayers().values().stream()
                .filter(player -> !player.isHost() && player.isAlive())
                .flatMap(player -> player.getActionSlots().stream().map(action -> action.groupId()).distinct())
                .count();
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("Authenticated user is required");
        }
        return user;
    }
}
