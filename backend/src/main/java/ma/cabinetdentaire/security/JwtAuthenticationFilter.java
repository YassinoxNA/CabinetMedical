package ma.cabinetdentaire.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ma.cabinetdentaire.entity.RoleCode;
import ma.cabinetdentaire.entity.UserStatus;
import ma.cabinetdentaire.repository.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService tokenService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtTokenService tokenService, UserRepository userRepository) {
        this.tokenService = tokenService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.startsWith("Bearer ")) {
            try {
                Claims claims = tokenService.parse(authorization.substring(7));
                UUID userId = UUID.fromString(claims.get("uid", String.class));
                var user = userRepository.findById(userId)
                        .filter(found -> found.getStatus() == UserStatus.ACTIVE)
                        .filter(found -> found.getUsername().equalsIgnoreCase(claims.getSubject()))
                        .orElseThrow(() -> new IllegalArgumentException("Compte JWT invalide"));
                RoleCode role = user.getRole().getCode();
                AuthenticatedUser principal = new AuthenticatedUser(
                        user.getId(),
                        user.getUsername(),
                        role,
                        user.isMustChangePassword()
                );
                var authentication = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
