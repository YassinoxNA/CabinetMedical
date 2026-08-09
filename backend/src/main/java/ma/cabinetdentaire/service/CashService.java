package ma.cabinetdentaire.service;

import ma.cabinetdentaire.dto.CashSessionResponse;
import ma.cabinetdentaire.entity.CashSession;
import ma.cabinetdentaire.repository.CashSessionRepository;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

@Service
public class CashService {
    private final CashSessionRepository sessions;
    private final JdbcTemplate jdbc;
    private final AuditService audit;
    private final Clock clock = Clock.systemUTC();

    public CashService(CashSessionRepository sessions, JdbcTemplate jdbc, AuditService audit) {
        this.sessions = sessions;
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional
    public CashSessionResponse open(BigDecimal balance, User actor, ClientRequestInfo client) {
        if (sessions.findFirstByStatus(CashSession.Status.OUVERTE).isPresent()) {
            throw new BusinessException("CASH_ALREADY_OPEN", "Une caisse est déjà ouverte.",
                    HttpStatus.CONFLICT);
        }
        CashSession session = sessions.save(new CashSession(balance, actor, clock.instant()));
        audit.record(actor, "CASH_OPENED", "CASH", "CASH_SESSION", session.getId(),
                "Ouverture de caisse.", client);
        return response(session);
    }

    @Transactional(readOnly = true)
    public CashSessionResponse current() {
        return response(requireOpen());
    }

    @Transactional
    public CashSessionResponse close(BigDecimal actual, User actor, ClientRequestInfo client) {
        CashSession session = requireOpen();
        session.close(actual, clock.instant());
        audit.record(actor, "CASH_CLOSED", "CASH", "CASH_SESSION", session.getId(),
                "Fermeture de caisse.", client);
        return response(session);
    }

    private CashSession requireOpen() {
        return sessions.findFirstByStatus(CashSession.Status.OUVERTE)
                .orElseThrow(() -> new BusinessException("CASH_NOT_OPEN",
                        "Aucune caisse ouverte.", HttpStatus.NOT_FOUND));
    }

    private CashSessionResponse response(CashSession session) {
        Instant end = session.getClosedAt() == null ? clock.instant() : session.getClosedAt();
        BigDecimal income = sum("select coalesce(sum(amount),0) from patient_payments "
                + "where cancelled_at is null and payment_date between ? and ?",
                session.getOpenedAt(), end);
        BigDecimal supplier = sum("select coalesce(sum(amount),0) from supplier_payments "
                + "where cancelled_at is null and payment_date between ? and ?",
                session.getOpenedAt(), end);
        BigDecimal expenses = sum("select coalesce(sum(amount),0) from expenses "
                + "where expense_date between ? and ?", session.getOpenedAt(), end);
        BigDecimal theoretical = session.getOpeningBalance().add(income)
                .subtract(supplier).subtract(expenses);
        return new CashSessionResponse(session.getId(), session.getOpenedAt(), session.getClosedAt(),
                session.getOpeningBalance(), income, supplier, expenses, theoretical,
                session.getClosingBalance(), session.getStatus().name(),
                session.getResponsibleUser().getId(), session.getResponsibleUser().getUsername());
    }

    private BigDecimal sum(String sql, Instant from, Instant to) {
        return jdbc.queryForObject(sql, BigDecimal.class, from, to);
    }
}
