package alafonin4.mafia.game.service;

import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.PlayerRole;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.dto.RoleCatalogItemResponse;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class GameRoleCatalogService {
    public List<RoleCatalogItemResponse> mafiaRoles() {
        return catalog().stream()
                .filter(item -> item.faction() == Faction.MAFIA)
                .sorted(Comparator.comparing(RoleCatalogItemResponse::name))
                .toList();
    }

    public List<RoleCatalogItemResponse> townRoles() {
        return catalog().stream()
                .filter(item -> item.faction() != Faction.MAFIA)
                .sorted(Comparator.comparing(RoleCatalogItemResponse::name))
                .toList();
    }

    private List<RoleCatalogItemResponse> catalog() {
        return List.of(
                item(PlayerRole.MAFIA, RoleVariant.DEFAULT, Faction.MAFIA, "Mafia",
                        "Basic mafia member who participates in the shared night kill.", true),
                item(PlayerRole.NINJA, RoleVariant.DEFAULT, Faction.MAFIA, "Ninja",
                        "Mafia member who joins the night kill and appears town-aligned on investigation.", false),
                item(PlayerRole.INTRIGUER, RoleVariant.DEFAULT, Faction.MAFIA, "Intriguer",
                        "Mafia member who joins the kill and can frame a target as mafia during investigations.", false),
                item(PlayerRole.MANIAC, RoleVariant.MANIAC_MAFIA, Faction.MAFIA, "Mafia maniac",
                        "Mafia-aligned maniac who joins the shared kill and also has an optional extra shot.", false),
                item(PlayerRole.CITIZEN, RoleVariant.DEFAULT, Faction.TOWN, "Citizen",
                        "Basic town player with no night action.", true),
                item(PlayerRole.BODYGUARD, RoleVariant.DEFAULT, Faction.TOWN, "Bodyguard",
                        "Protects one player and cancels night actions directed at that target.", false),
                item(PlayerRole.COMMISSIONER, RoleVariant.DEFAULT, Faction.TOWN, "Commissioner",
                        "Checks one player at night to learn their alignment.", false),
                item(PlayerRole.SHERIFF, RoleVariant.DEFAULT, Faction.TOWN, "Sheriff",
                        "Chooses each night between checking alignment and shooting a target.", false),
                item(PlayerRole.JOURNALIST, RoleVariant.JOURNALIST_ROLE_REVEAL, Faction.TOWN, "Journalist: role reveal",
                        "Learns the target player's role and status.", false),
                item(PlayerRole.JOURNALIST, RoleVariant.JOURNALIST_VISITOR_REPORT, Faction.TOWN, "Journalist: visitor report",
                        "Learns which role types visited the target player during the night.", false),
                item(PlayerRole.PROSTITUTE, RoleVariant.PROSTITUTE_BLOCK_NIGHT, Faction.TOWN, "Prostitute: block",
                        "Blocks the night action of the chosen target.", false),
                item(PlayerRole.PROSTITUTE, RoleVariant.PROSTITUTE_MUTE_AND_VOTE_SHIELD, Faction.TOWN, "Prostitute: mute and shield",
                        "Applies day mute and vote immunity to the chosen target for the next day.", false),
                item(PlayerRole.PLAGUE_DOCTOR, RoleVariant.DEFAULT, Faction.TOWN, "Plague doctor",
                        "Marks a target so the mark flips whether that player dies from the night kill.", false),
                item(PlayerRole.MANIAC, RoleVariant.MANIAC_NEUTRAL, Faction.NEUTRAL, "Neutral maniac",
                        "Independent killer with a separate win condition.", false)
        );
    }

    private RoleCatalogItemResponse item(PlayerRole role, RoleVariant variant, Faction faction, String name,
                                         String description, boolean defaultFillRole) {
        return new RoleCatalogItemResponse(
                role.name() + ":" + variant.name(),
                role,
                variant,
                faction,
                name,
                description,
                defaultFillRole
        );
    }
}
