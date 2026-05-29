package alafonin4.mafia.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "club_memberships")
public class ClubMembership {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "club_id", nullable = false)
    private PrivateClub club;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClubMembershipRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClubMembershipStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime joinedAt;

    public Long getId() {
        return id;
    }

    public PrivateClub getClub() {
        return club;
    }

    public void setClub(PrivateClub club) {
        this.club = club;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public ClubMembershipRole getRole() {
        return role;
    }

    public void setRole(ClubMembershipRole role) {
        this.role = role;
    }

    public ClubMembershipStatus getStatus() {
        return status;
    }

    public void setStatus(ClubMembershipStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(LocalDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }

    @PrePersist
    private void initializeTimestamps() {
        if (createdAt == null) {
          createdAt = LocalDateTime.now();
        }
        if (status == ClubMembershipStatus.ACTIVE && joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }
}
