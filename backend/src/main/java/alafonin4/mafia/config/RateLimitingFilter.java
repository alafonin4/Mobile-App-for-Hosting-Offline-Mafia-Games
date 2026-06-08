package alafonin4.mafia.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    private static final Map<String, LimitRule> RULES = Map.of(
            "POST /auth/login", new LimitRule(10, Duration.ofMinutes(1)),
            "POST /auth/register", new LimitRule(5, Duration.ofMinutes(5)),
            "POST /auth/refresh", new LimitRule(30, Duration.ofMinutes(1)),
            "GET /users/search", new LimitRule(40, Duration.ofMinutes(1)),
            "GET /users/nickname-availability", new LimitRule(40, Duration.ofMinutes(1)),
            "POST /game/rooms/", new LimitRule(12, Duration.ofMinutes(10)),
            "POST /friends/", new LimitRule(20, Duration.ofHours(1))
    );

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        LimitRule rule = RULES.get(request.getMethod() + " " + request.getRequestURI());
        if (rule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = ruleKey(request);
        long now = System.currentTimeMillis();
        Window window = windows.compute(key, (ignored, current) -> {
            if (current == null || now >= current.resetAtMillis()) {
                return new Window(now + rule.window().toMillis(), new AtomicInteger(1));
            }
            current.count().incrementAndGet();
            return current;
        });

        if (window.count().get() > rule.maxRequests()) {
            long retryAfterSeconds = Math.max(1L, (window.resetAtMillis() - now + 999L) / 1000L);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write("Too many requests");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String ruleKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        String clientIp = forwardedFor == null || forwardedFor.isBlank()
                ? request.getRemoteAddr()
                : forwardedFor.split(",")[0].trim();
        return request.getMethod() + " " + request.getRequestURI() + " " + clientIp;
    }

    private record LimitRule(int maxRequests, Duration window) {
    }

    private record Window(long resetAtMillis, AtomicInteger count) {
    }
}
