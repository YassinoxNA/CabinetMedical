package ma.cabinetdentaire.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Set;

/**
 * A restored emergency mirror is intentionally read-only. Allowing both PCs
 * to write while they cannot communicate would create two incompatible
 * medical records that cannot be merged safely afterwards.
 */
@Component
public class EmergencyReadOnlyFilter extends OncePerRequestFilter {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private final boolean readOnly;

    public EmergencyReadOnlyFilter(@Value("${app.emergency-read-only:false}") boolean readOnly) {
        this.readOnly = readOnly;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean authenticationRequest = path.startsWith("/api/v1/auth/");
        if (!readOnly || SAFE_METHODS.contains(request.getMethod()) || authenticationRequest) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(423);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{" +
                "\"timestamp\":\"" + Instant.now() + "\"," +
                "\"status\":423," +
                "\"code\":\"EMERGENCY_READ_ONLY\"," +
                "\"message\":\"Le PC principal est indisponible. Le mode secours permet de consulter les donnees, mais les modifications sont bloquees pour eviter les conflits.\"," +
                "\"path\":\"" + path.replace("\\", "\\\\").replace("\"", "\\\"") + "\"," +
                "\"fieldErrors\":null}");
    }
}
