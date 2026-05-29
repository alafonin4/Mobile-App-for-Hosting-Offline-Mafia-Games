package alafonin4.mafia.gamehistory.service;

import alafonin4.mafia.dto.user.ConnectionSummaryResponse;
import alafonin4.mafia.dto.user.DossierCareerResponse;
import alafonin4.mafia.dto.user.DossierFormResponse;
import alafonin4.mafia.dto.user.DossierTableStatsResponse;
import alafonin4.mafia.dto.user.DossierUserResponse;
import alafonin4.mafia.dto.user.DossierVotingResponse;
import alafonin4.mafia.dto.user.FriendRelation;
import alafonin4.mafia.dto.user.PlayerDossierResponse;
import alafonin4.mafia.dto.user.RecentGameSummaryResponse;
import alafonin4.mafia.dto.user.RoleMasteryResponse;
import alafonin4.mafia.entity.User;
import alafonin4.mafia.game.domain.Faction;
import alafonin4.mafia.game.domain.PlayerStatus;
import alafonin4.mafia.game.domain.RoleVariant;
import alafonin4.mafia.game.domain.VoteRoundType;
import alafonin4.mafia.game.dto.VoteEntryResponse;
import alafonin4.mafia.game.dto.VoteRoundResponse;
import alafonin4.mafia.game.service.GameRoleCatalogService;
import alafonin4.mafia.gamehistory.dto.GameAwardResponse;
import alafonin4.mafia.gamehistory.dto.GameHistoryPlayerResponse;
import alafonin4.mafia.gamehistory.dto.GameRecapHeadlineResponse;
import alafonin4.mafia.gamehistory.dto.GameRecapMetricResponse;
import alafonin4.mafia.gamehistory.dto.GameRecapPlayerResponse;
import alafonin4.mafia.gamehistory.dto.GameRecapResponse;
import alafonin4.mafia.gamehistory.entity.CompletedGameRecord;
import alafonin4.mafia.gamehistory.repository.CompletedGameRecordRepository;
import alafonin4.mafia.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.IntPredicate;
import java.util.stream.Collectors;

@Service
public class GameInsightsService {
    private final CompletedGameRecordRepository completedGameRecordRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final Map<String, String> roleNamesById;

    public GameInsightsService(CompletedGameRecordRepository completedGameRecordRepository,
                               UserRepository userRepository,
                               ObjectMapper objectMapper,
                               GameRoleCatalogService roleCatalogService) {
        this.completedGameRecordRepository = completedGameRecordRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.roleNamesById = new LinkedHashMap<>();
        roleCatalogService.mafiaRoles().forEach(role -> roleNamesById.put(role.id(), role.name()));
        roleCatalogService.townRoles().forEach(role -> roleNamesById.put(role.id(), role.name()));
    }

    public GameRecapResponse buildRecap(CompletedGameRecord record) {
        List<GameHistoryPlayerResponse> players = readPlayers(record.getPlayersJson());
        List<VoteRoundResponse> voteHistory = readVoteHistory(record.getVoteHistoryJson());
        Map<Long, User> usersById = loadUsers(players.stream().map(GameHistoryPlayerResponse::userId).toList());
        Map<Long, GameHistoryPlayerResponse> playersById = players.stream()
                .collect(Collectors.toMap(GameHistoryPlayerResponse::userId, Function.identity()));

        VoteSummary voteSummary = summarizeVotes(voteHistory, playersById);
        List<GameAwardResponse> awards = new ArrayList<>();

        awardWinner(players, voteSummary.totalVotesByUser(), voteSummary.eliminationHitsByUser(),
                "execution-caller", "Execution Caller", "Elimination precision", awards, usersById);
        awardWinner(players, voteSummary.totalVotesByUser(), voteSummary.mafiaVotesByUser(),
                "mafia-hunter", "Mafia Hunter", "Mafia catch rate", awards, usersById);

        if (voteSummary.totalVoteEntries() > 0) {
            pickTopPlayer(players, voteSummary.receivedVotesByUser(),
                    metric -> true,
                    votes -> votes,
                    votes -> votes + " incoming ballots")
                    .map(winner -> toAward(
                            "pressure-magnet",
                            "Pressure Magnet",
                            winner.player(),
                            "Pressure absorbed",
                            winner.metricValue(),
                            usersById
                    ))
                    .ifPresent(awards::add);
        }

        players.stream()
                .filter(GameHistoryPlayerResponse::host)
                .min(Comparator.comparing(GameHistoryPlayerResponse::userId))
                .map(host -> toAward("host-spotlight", "Host Spotlight", host, "Host note", "Hosted the table", usersById))
                .ifPresent(awards::add);

        List<GameRecapPlayerResponse> survivors = players.stream()
                .filter(player -> player.status() == PlayerStatus.ALIVE)
                .sorted(Comparator.comparing(GameHistoryPlayerResponse::host).reversed()
                        .thenComparing(GameHistoryPlayerResponse::userId))
                .map(player -> toRecapPlayer(player, usersById))
                .toList();

        String hostName = players.stream()
                .filter(GameHistoryPlayerResponse::host)
                .findFirst()
                .map(player -> displayName(player, usersById))
                .orElse("Unknown");

        List<GameRecapMetricResponse> tableSummary = List.of(
                new GameRecapMetricResponse("Attendance", String.valueOf(record.getParticipantCount())),
                new GameRecapMetricResponse("Survivors", String.valueOf(survivors.size())),
                new GameRecapMetricResponse("Ballots cast", String.valueOf(voteSummary.totalVoteEntries())),
                new GameRecapMetricResponse("Host", hostName)
        );

        return new GameRecapResponse(
                new GameRecapHeadlineResponse(
                        record.getRoomName(),
                        record.getFinishedAt(),
                        record.getParticipantCount(),
                        record.getWinner(),
                        record.getDayNumber(),
                        record.getNightNumber()
                ),
                awards,
                survivors,
                tableSummary
        );
    }

    public PlayerDossierResponse buildDossier(User subject, FriendRelation relation) {
        List<CompletedGameRecord> games = completedGameRecordRepository.findAllForParticipant(subject.getId());
        Map<Long, Integer> sharedGamesByUser = new HashMap<>();
        Map<String, RoleAggregate> roleAggregates = new HashMap<>();
        Map<Long, Integer> receivedVotesByUser = new HashMap<>();

        int totalVotesCast = 0;
        int eliminationHits = 0;
        int mafiaVotes = 0;
        int hostedGames = 0;
        int totalPlayers = 0;
        int totalDays = 0;
        int totalNights = 0;
        int totalGames = 0;
        int wins = 0;

        List<RecentGameSummaryResponse> recentGames = new ArrayList<>();
        List<Boolean> outcomes = new ArrayList<>();
        Map<Long, User> knownUsers = new HashMap<>();

        for (CompletedGameRecord game : games) {
            List<GameHistoryPlayerResponse> players = readPlayers(game.getPlayersJson());
            Map<Long, GameHistoryPlayerResponse> playersById = players.stream()
                    .collect(Collectors.toMap(GameHistoryPlayerResponse::userId, Function.identity()));
            GameHistoryPlayerResponse player = playersById.get(subject.getId());
            if (player == null) {
                continue;
            }
            totalGames++;

            Map<Long, User> usersById = loadUsers(players.stream().map(GameHistoryPlayerResponse::userId).toList());
            knownUsers.putAll(usersById);
            VoteSummary voteSummary = summarizeVotes(readVoteHistory(game.getVoteHistoryJson()), playersById);

            totalVotesCast += voteSummary.totalVotesByUser().getOrDefault(subject.getId(), 0);
            eliminationHits += voteSummary.eliminationHitsByUser().getOrDefault(subject.getId(), 0);
            mafiaVotes += voteSummary.mafiaVotesByUser().getOrDefault(subject.getId(), 0);
            receivedVotesByUser.merge(subject.getId(), voteSummary.receivedVotesByUser().getOrDefault(subject.getId(), 0), Integer::sum);

            if (player.host()) {
                hostedGames++;
            }

            totalPlayers += game.getParticipantCount();
            totalDays += game.getDayNumber();
            totalNights += game.getNightNumber();

            boolean won = isWinner(player, game);
            if (won) {
                wins++;
            }
            outcomes.add(won);

            String roleId = roleId(player);
            RoleAggregate roleAggregate = roleAggregates.computeIfAbsent(roleId,
                    ignored -> new RoleAggregate(roleName(player.role().name(), player.variant())));
            roleAggregate.recordGame(won);

            for (GameHistoryPlayerResponse participant : players) {
                if (!participant.userId().equals(subject.getId())) {
                    sharedGamesByUser.merge(participant.userId(), 1, Integer::sum);
                }
            }

            recentGames.add(new RecentGameSummaryResponse(
                    game.getId(),
                    game.getRoomId(),
                    game.getRoomName(),
                    game.getFinishedAt(),
                    game.getWinner(),
                    won,
                    roleAggregate.roleName(),
                    player.host()
            ));
        }

        List<RoleMasteryResponse> mastery = roleAggregates.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, RoleAggregate>>comparingInt(entry -> entry.getValue().playCount()).reversed()
                        .thenComparing(entry -> entry.getValue().wins(), Comparator.reverseOrder())
                        .thenComparing(Map.Entry::getKey))
                .limit(3)
                .map(entry -> new RoleMasteryResponse(
                        entry.getKey(),
                        entry.getValue().roleName(),
                        entry.getValue().playCount(),
                        ratio(entry.getValue().wins(), entry.getValue().playCount())
                ))
                .toList();

        List<ConnectionSummaryResponse> connections = sharedGamesByUser.entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed().thenComparing(Map.Entry::getKey))
                .limit(3)
                .map(entry -> {
                    User connection = knownUsers.get(entry.getKey());
                    return new ConnectionSummaryResponse(
                            entry.getKey(),
                            connection == null ? "Player " + entry.getKey() : connection.getNickname(),
                            connection == null ? null : connection.getAvatarUrl(),
                            entry.getValue()
                    );
                })
                .toList();

        String streakResult = "NONE";
        int streakCount = 0;
        if (!outcomes.isEmpty()) {
            boolean latest = outcomes.get(0);
            streakResult = latest ? "W" : "L";
            for (boolean outcome : outcomes) {
                if (outcome == latest) {
                    streakCount++;
                } else {
                    break;
                }
            }
        }

        Double eliminationHitRate = totalVotesCast >= 2 ? ratio(eliminationHits, totalVotesCast) : null;
        Double mafiaCatchRate = totalVotesCast >= 2 ? ratio(mafiaVotes, totalVotesCast) : null;

        return new PlayerDossierResponse(
                new DossierUserResponse(subject.getId(), subject.getNickname(), subject.getAvatarUrl(), relation),
                new DossierCareerResponse(
                        totalGames,
                        wins,
                        totalGames == 0 ? 0.0 : ratio(wins, totalGames),
                        subject.getRating(),
                        hostedGames
                ),
                new DossierFormResponse(streakResult, streakCount),
                mastery,
                new DossierTableStatsResponse(
                        average(totalPlayers, totalGames),
                        average(totalDays, totalGames),
                        average(totalNights, totalGames)
                ),
                new DossierVotingResponse(
                        totalVotesCast,
                        eliminationHitRate,
                        mafiaCatchRate,
                        receivedVotesByUser.getOrDefault(subject.getId(), 0)
                ),
                connections,
                recentGames.stream().limit(5).toList(),
                totalGames < 3
        );
    }

    private void awardWinner(List<GameHistoryPlayerResponse> players,
                             Map<Long, Integer> totalVotesByUser,
                             Map<Long, Integer> supportingMetric,
                             String key,
                             String title,
                             String metricLabel,
                             List<GameAwardResponse> awards,
                             Map<Long, User> usersById) {
        pickTopPlayer(players, totalVotesByUser, supportingMetric,
                votes -> votes >= 2,
                votes -> votes,
                (primary, supporting) -> String.format(Locale.US, "%.0f%%", primary * 100.0))
                .map(winner -> toAward(key, title, winner.player(), metricLabel, winner.metricValue(), usersById))
                .ifPresent(awards::add);
    }

    private Optional<AwardWinner> pickTopPlayer(List<GameHistoryPlayerResponse> players,
                                                Map<Long, Integer> totalVotesByUser,
                                                Map<Long, Integer> supportingMetric,
                                                IntPredicate eligibility,
                                                Function<Integer, Integer> primarySupportingValue,
                                                MetricFormatter formatter) {
        return players.stream()
                .map(player -> {
                    int totalVotes = totalVotesByUser.getOrDefault(player.userId(), 0);
                    int supporting = supportingMetric.getOrDefault(player.userId(), 0);
                    if (!eligibility.test(totalVotes)) {
                        return null;
                    }
                    double primary = totalVotes == 0 ? 0.0 : supporting / (double) totalVotes;
                    return new AwardCandidate(
                            player,
                            primary,
                            primarySupportingValue.apply(supporting),
                            formatter.format(primary, supporting)
                    );
                })
                .filter(Objects::nonNull)
                .max(Comparator.comparingDouble(AwardCandidate::primaryMetric)
                        .thenComparing(AwardCandidate::supportingMetric)
                        .thenComparing(candidate -> candidate.player().userId(), Comparator.reverseOrder()))
                .map(candidate -> new AwardWinner(candidate.player(), candidate.metricValue()));
    }

    private Optional<AwardWinner> pickTopPlayer(List<GameHistoryPlayerResponse> players,
                                                Map<Long, Integer> metricByUser,
                                                IntPredicate eligibility,
                                                Function<Integer, Integer> primaryMetric,
                                                Function<Integer, String> metricLabel) {
        return players.stream()
                .map(player -> {
                    int metric = metricByUser.getOrDefault(player.userId(), 0);
                    if (!eligibility.test(metric)) {
                        return null;
                    }
                    return new AwardCandidate(player, primaryMetric.apply(metric).doubleValue(), metric, metricLabel.apply(metric));
                })
                .filter(Objects::nonNull)
                .max(Comparator.comparingDouble(AwardCandidate::primaryMetric)
                        .thenComparing(AwardCandidate::supportingMetric)
                        .thenComparing(candidate -> candidate.player().userId(), Comparator.reverseOrder()))
                .map(candidate -> new AwardWinner(candidate.player(), candidate.metricValue()));
    }

    private GameAwardResponse toAward(String key,
                                      String title,
                                      GameHistoryPlayerResponse player,
                                      String metricLabel,
                                      String metricValue,
                                      Map<Long, User> usersById) {
        User user = usersById.get(player.userId());
        return new GameAwardResponse(
                key,
                title,
                player.userId(),
                displayName(player, usersById),
                user == null ? null : user.getAvatarUrl(),
                metricLabel,
                metricValue
        );
    }

    private GameRecapPlayerResponse toRecapPlayer(GameHistoryPlayerResponse player, Map<Long, User> usersById) {
        User user = usersById.get(player.userId());
        return new GameRecapPlayerResponse(
                player.userId(),
                displayName(player, usersById),
                user == null ? null : user.getAvatarUrl(),
                roleName(player.role().name(), player.variant()),
                player.host()
        );
    }

    private VoteSummary summarizeVotes(List<VoteRoundResponse> voteRounds, Map<Long, GameHistoryPlayerResponse> playersById) {
        Map<Long, Integer> totalVotesByUser = new HashMap<>();
        Map<Long, Integer> eliminationHitsByUser = new HashMap<>();
        Map<Long, Integer> mafiaVotesByUser = new HashMap<>();
        Map<Long, Integer> receivedVotesByUser = new HashMap<>();
        int totalVoteEntries = 0;

        for (VoteRoundResponse round : voteRounds) {
            if (round.type() != VoteRoundType.DAY_ELIMINATION) {
                continue;
            }

            for (VoteEntryResponse entry : round.entries()) {
                if (entry.voterId() == null || entry.targetId() == null) {
                    continue;
                }
                totalVoteEntries++;
                totalVotesByUser.merge(entry.voterId(), 1, Integer::sum);
                receivedVotesByUser.merge(entry.targetId(), 1, Integer::sum);

                if (round.eliminatedPlayerId() != null && round.eliminatedPlayerId().equals(entry.targetId())) {
                    eliminationHitsByUser.merge(entry.voterId(), 1, Integer::sum);
                }

                GameHistoryPlayerResponse target = playersById.get(entry.targetId());
                if (target != null && target.faction() == Faction.MAFIA) {
                    mafiaVotesByUser.merge(entry.voterId(), 1, Integer::sum);
                }
            }
        }

        return new VoteSummary(totalVotesByUser, eliminationHitsByUser, mafiaVotesByUser, receivedVotesByUser, totalVoteEntries);
    }

    private Map<Long, User> loadUsers(List<Long> userIds) {
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private List<GameHistoryPlayerResponse> readPlayers(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot deserialize game players", exception);
        }
    }

    private List<VoteRoundResponse> readVoteHistory(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot deserialize vote history", exception);
        }
    }

    private boolean isWinner(GameHistoryPlayerResponse player, CompletedGameRecord game) {
        return switch (game.getWinner()) {
            case TOWN -> player.faction() == Faction.TOWN;
            case MAFIA -> player.faction() == Faction.MAFIA;
            case NEUTRAL -> game.getWinnerUserId() != null && game.getWinnerUserId().equals(player.userId());
            default -> false;
        };
    }

    private String displayName(GameHistoryPlayerResponse player, Map<Long, User> usersById) {
        User user = usersById.get(player.userId());
        if (user != null && user.getNickname() != null && !user.getNickname().isBlank()) {
            return user.getNickname();
        }
        return player.email();
    }

    private String roleId(GameHistoryPlayerResponse player) {
        return player.role().name() + ":" + player.variant().name();
    }

    private String roleName(String role, RoleVariant variant) {
        return roleNamesById.getOrDefault(role + ":" + variant.name(), humanizeRole(role, variant));
    }

    private String humanizeRole(String role, RoleVariant variant) {
        String base = role.toLowerCase(Locale.ROOT).replace('_', ' ');
        String variantLabel = variant == RoleVariant.DEFAULT ? "" : " (" + variant.name().toLowerCase(Locale.ROOT).replace('_', ' ') + ")";
        return Character.toUpperCase(base.charAt(0)) + base.substring(1) + variantLabel;
    }

    private double ratio(int part, int total) {
        return total == 0 ? 0.0 : Math.round((part * 1000.0) / total) / 1000.0;
    }

    private double average(int total, int count) {
        return count == 0 ? 0.0 : Math.round((total * 10.0) / count) / 10.0;
    }

    private record VoteSummary(
            Map<Long, Integer> totalVotesByUser,
            Map<Long, Integer> eliminationHitsByUser,
            Map<Long, Integer> mafiaVotesByUser,
            Map<Long, Integer> receivedVotesByUser,
            int totalVoteEntries
    ) {
    }

    private record AwardCandidate(
            GameHistoryPlayerResponse player,
            double primaryMetric,
            int supportingMetric,
            String metricValue
    ) {
    }

    private record AwardWinner(GameHistoryPlayerResponse player, String metricValue) {
    }

    private static final class RoleAggregate {
        private final String roleName;
        private int playCount;
        private int wins;

        private RoleAggregate(String roleName) {
            this.roleName = roleName;
        }

        private void recordGame(boolean won) {
            playCount++;
            if (won) {
                wins++;
            }
        }

        private String roleName() {
            return roleName;
        }

        private int playCount() {
            return playCount;
        }

        private int wins() {
            return wins;
        }
    }

    @FunctionalInterface
    private interface MetricFormatter {
        String format(double primary, int supporting);
    }
}
