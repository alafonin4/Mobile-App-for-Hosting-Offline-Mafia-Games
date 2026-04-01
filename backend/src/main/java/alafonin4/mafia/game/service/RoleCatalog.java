package alafonin4.mafia.game.service;

import alafonin4.mafia.game.domain.ActionCode;
import alafonin4.mafia.game.domain.ActionSlotDefinition;
import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.NightResolutionPhase;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.RoleDefinition;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.domain.RoomRoleSlot;
import alafonin4.mafia.game.domain.TargetRule;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RoleCatalog {
    public RoleVariant normalizeVariant(PlayerRole role, RoleVariant variant) {
        return switch (role) {
            case PROSTITUTE -> variant == null || variant == RoleVariant.DEFAULT
                    ? RoleVariant.PROSTITUTE_BLOCK_NIGHT
                    : variant;
            case JOURNALIST -> variant == null || variant == RoleVariant.DEFAULT
                    ? RoleVariant.JOURNALIST_ROLE_REVEAL
                    : variant;
            case MANIAC -> variant == null || variant == RoleVariant.DEFAULT
                    ? RoleVariant.MANIAC_NEUTRAL
                    : variant;
            default -> RoleVariant.DEFAULT;
        };
    }

    public void validateSlot(RoomRoleSlot slot) {
        switch (slot.role()) {
            case CITIZEN, MAFIA, BODYGUARD, COMMISSIONER, SHERIFF, NINJA, INTRIGUER, PLAGUE_DOCTOR -> {
                if (slot.variant() != RoleVariant.DEFAULT) {
                    throw new IllegalArgumentException("Role " + slot.role() + " does not support variant " + slot.variant());
                }
            }
            case PROSTITUTE -> requireVariant(slot.variant(), RoleVariant.PROSTITUTE_BLOCK_NIGHT, RoleVariant.PROSTITUTE_MUTE_AND_VOTE_SHIELD);
            case JOURNALIST -> requireVariant(slot.variant(), RoleVariant.JOURNALIST_ROLE_REVEAL, RoleVariant.JOURNALIST_VISITOR_REPORT);
            case MANIAC -> requireVariant(slot.variant(), RoleVariant.MANIAC_NEUTRAL, RoleVariant.MANIAC_MAFIA);
        }
    }

    public RoleDefinition definitionFor(RoomRoleSlot slot) {
        return switch (slot.role()) {
            case CITIZEN -> new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of());
            case MAFIA -> new RoleDefinition(slot.role(), slot.variant(), Faction.MAFIA, Faction.MAFIA, List.of(
                    slot("mafia-kill", "mafia-kill", ActionCode.MAFIA_KILL, NightResolutionPhase.KILL_SETUP, 100, TargetRule.REQUIRED_PLAYER)
            ));
            case BODYGUARD -> new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                    slot("bodyguard-protect", "bodyguard-protect", ActionCode.BODYGUARD_PROTECT, NightResolutionPhase.ABSOLUTE_PROTECTION, 0, TargetRule.REQUIRED_PLAYER)
            ));
            case JOURNALIST -> journalistDefinition(slot);
            case PROSTITUTE -> prostituteDefinition(slot);
            case COMMISSIONER -> new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                    slot("commissioner-check", "commissioner-check", ActionCode.ALIGNMENT_CHECK, NightResolutionPhase.INVESTIGATION, 100, TargetRule.REQUIRED_PLAYER)
            ));
            case SHERIFF -> new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                    slot("sheriff-check", "sheriff-choice", ActionCode.ALIGNMENT_CHECK, NightResolutionPhase.INVESTIGATION, 100, TargetRule.REQUIRED_PLAYER),
                    slot("sheriff-shot", "sheriff-choice", ActionCode.ROLE_KILL, NightResolutionPhase.KILL_SETUP, 200, TargetRule.REQUIRED_PLAYER)
            ));
            case NINJA -> new RoleDefinition(slot.role(), slot.variant(), Faction.MAFIA, Faction.TOWN, List.of(
                    slot("ninja-mafia-kill", "mafia-kill", ActionCode.MAFIA_KILL, NightResolutionPhase.KILL_SETUP, 100, TargetRule.REQUIRED_PLAYER)
            ));
            case INTRIGUER -> new RoleDefinition(slot.role(), slot.variant(), Faction.MAFIA, Faction.MAFIA, List.of(
                    slot("intriguer-mafia-kill", "mafia-kill", ActionCode.MAFIA_KILL, NightResolutionPhase.KILL_SETUP, 100, TargetRule.REQUIRED_PLAYER),
                    slot("intriguer-frame", "intriguer-frame", ActionCode.FRAME_TARGET, NightResolutionPhase.INVESTIGATION_OVERRIDE, 100, TargetRule.REQUIRED_PLAYER)
            ));
            case MANIAC -> maniacDefinition(slot);
            case PLAGUE_DOCTOR -> new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                    slot("plague-mark", "plague-mark", ActionCode.PLAGUE_DOCTOR_MARK, NightResolutionPhase.POST_PROCESS, 100, TargetRule.REQUIRED_PLAYER)
            ));
        };
    }

    private RoleDefinition prostituteDefinition(RoomRoleSlot slot) {
        return slot.variant() == RoleVariant.PROSTITUTE_MUTE_AND_VOTE_SHIELD
                ? new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                slot("prostitute-mute", "prostitute-night", ActionCode.PROSTITUTE_MUTE_SHIELD, NightResolutionPhase.POST_PROCESS, 100, TargetRule.REQUIRED_PLAYER)
        ))
                : new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                slot("prostitute-block", "prostitute-night", ActionCode.PROSTITUTE_BLOCK, NightResolutionPhase.BLOCK, 0, TargetRule.REQUIRED_PLAYER)
        ));
    }

    private RoleDefinition journalistDefinition(RoomRoleSlot slot) {
        return slot.variant() == RoleVariant.JOURNALIST_VISITOR_REPORT
                ? new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                slot("journalist-visitors", "journalist-night", ActionCode.JOURNALIST_VISITOR_REPORT, NightResolutionPhase.INFORMATION, 200, TargetRule.REQUIRED_PLAYER)
        ))
                : new RoleDefinition(slot.role(), slot.variant(), Faction.TOWN, Faction.TOWN, List.of(
                slot("journalist-role", "journalist-night", ActionCode.JOURNALIST_ROLE_CHECK, NightResolutionPhase.INFORMATION, 100, TargetRule.REQUIRED_PLAYER)
        ));
    }

    private RoleDefinition maniacDefinition(RoomRoleSlot slot) {
        return slot.variant() == RoleVariant.MANIAC_MAFIA
                ? new RoleDefinition(slot.role(), slot.variant(), Faction.MAFIA, Faction.MAFIA, List.of(
                slot("maniac-mafia-kill", "mafia-kill", ActionCode.MAFIA_KILL, NightResolutionPhase.KILL_SETUP, 100, TargetRule.REQUIRED_PLAYER),
                slot("maniac-extra-shot", "maniac-extra-shot", ActionCode.ROLE_KILL, NightResolutionPhase.KILL_SETUP, 300, TargetRule.OPTIONAL_PLAYER)
        ))
                : new RoleDefinition(slot.role(), slot.variant(), Faction.NEUTRAL, Faction.NEUTRAL, List.of(
                slot("maniac-shot", "maniac-shot", ActionCode.ROLE_KILL, NightResolutionPhase.KILL_SETUP, 300, TargetRule.OPTIONAL_PLAYER)
        ));
    }

    private ActionSlotDefinition slot(String slotId, String groupId, ActionCode actionCode,
                                      NightResolutionPhase phase, int priority, TargetRule targetRule) {
        return new ActionSlotDefinition(slotId, groupId, actionCode, phase, priority, targetRule);
    }

    private void requireVariant(RoleVariant actual, RoleVariant first, RoleVariant second) {
        if (actual != first && actual != second) {
            throw new IllegalArgumentException("Unsupported role variant: " + actual);
        }
    }
}
