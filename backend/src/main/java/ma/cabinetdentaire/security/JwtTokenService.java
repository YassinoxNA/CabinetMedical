package ma.cabinetdentaire.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import ma.cabinetdentaire.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtTokenService {

    private final SecurityProperties properties;
    private final SecretKey key;
    private final Clock clock;

    @Autowired
    public JwtTokenService(SecurityProperties properties) {
        this(properties, Clock.systemUTC());
    }

    JwtTokenService(SecurityProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        byte[] decoded = Decoders.BASE64.decode(properties.jwtSecretBase64());
        if (decoded.length < 32) {
            throw new IllegalArgumentException("JWT_SECRET_B64 doit contenir au moins 256 bits");
        }
        this.key = Keys.hmacShaKeyFor(decoded);
    }

    public String createAccessToken(User user) {
        Instant issuedAt = clock.instant();
        Instant expiresAt = issuedAt.plus(properties.accessTokenTtl());
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("uid", user.getId().toString())
                .claim("role", user.getRole().getCode().name())
                .claim("passwordChangeRequired", user.isMustChangePassword())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
