package ma.cabinetdentaire.service;

import ma.cabinetdentaire.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

@Service
public class SessionRevocationService {

    private final RefreshTokenRepository repository;
    private final Clock clock = Clock.systemUTC();

    public SessionRevocationService(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void revokeAll(UUID userId) {
        var now = clock.instant();
        repository.findAllByUserIdAndRevokedAtIsNull(userId)
                .forEach(token -> token.revoke(now));
    }
}
