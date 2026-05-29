package alafonin4.mafia.gamehistory.dto;

import java.util.List;

public record GameRecapResponse(
        GameRecapHeadlineResponse headline,
        List<GameAwardResponse> awards,
        List<GameRecapPlayerResponse> survivors,
        List<GameRecapMetricResponse> tableSummary
) {
}
