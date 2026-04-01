package alafonin4.mafia.game.domain;

public class DayRestriction {
    private final boolean muted;
    private final boolean voteImmune;

    public DayRestriction(boolean muted, boolean voteImmune) {
        this.muted = muted;
        this.voteImmune = voteImmune;
    }

    public boolean isMuted() {
        return muted;
    }

    public boolean isVoteImmune() {
        return voteImmune;
    }
}
