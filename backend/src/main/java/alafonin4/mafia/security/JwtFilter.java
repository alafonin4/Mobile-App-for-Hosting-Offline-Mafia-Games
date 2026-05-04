package alafonin4.mafia.security;

import alafonin4.mafia.entity.User;
import alafonin4.mafia.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private final JwtService jwtService;
    @Autowired
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        String email;
        try {
            email = jwtService.extractEmail(token);
        } catch (JwtException | IllegalArgumentException exception) {
            SecurityContextHolder.clearContext();
            log.warn("Ignoring invalid bearer token for {} {}: {}",
                    request.getMethod(), request.getRequestURI(), exception.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(user, null, List.of());

            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("Authenticated request {} {} for user {}",
                    request.getMethod(), request.getRequestURI(), user.getEmail());
        } else {
            log.warn("JWT subject {} was not found in database for {} {}",
                    email, request.getMethod(), request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }

}
