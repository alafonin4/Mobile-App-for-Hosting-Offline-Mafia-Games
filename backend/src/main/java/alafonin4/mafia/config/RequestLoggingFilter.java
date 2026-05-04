package alafonin4.mafia.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String REQUEST_ID_MDC_KEY = "requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = Optional.ofNullable(request.getHeader(REQUEST_ID_HEADER))
                .filter(value -> !value.isBlank())
                .orElseGet(() -> UUID.randomUUID().toString());
        long startedAt = System.currentTimeMillis();

        MDC.put(REQUEST_ID_MDC_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - startedAt;
            String path = request.getRequestURI() + (request.getQueryString() == null ? "" : "?" + request.getQueryString());
            int status = response.getStatus();

            if (status >= 500) {
                log.error("HTTP {} {} completed with status {} in {} ms from {}",
                        request.getMethod(), path, status, durationMs, request.getRemoteAddr());
            } else if (status >= 400) {
                log.warn("HTTP {} {} completed with status {} in {} ms from {}",
                        request.getMethod(), path, status, durationMs, request.getRemoteAddr());
            } else {
                log.info("HTTP {} {} completed with status {} in {} ms from {}",
                        request.getMethod(), path, status, durationMs, request.getRemoteAddr());
            }

            MDC.remove(REQUEST_ID_MDC_KEY);
        }
    }
}
