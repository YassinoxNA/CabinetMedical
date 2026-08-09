package ma.cabinetdentaire.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

/**
 * Serializes appointment mutations for this single-cabinet installation.
 *
 * <p>The PostgreSQL transaction-scoped advisory lock is released automatically
 * on commit or rollback. Taking it before loading and checking appointments
 * makes the conflict check and the following insert/update one atomic critical
 * section, even when two desktop clients submit simultaneously.</p>
 */
@Repository
public class AppointmentCalendarLock {

    private static final long CALENDAR_LOCK_KEY = 4_341_425_449_524_532L;

    @PersistenceContext
    private EntityManager entityManager;

    public void acquire() {
        entityManager.createNativeQuery("select pg_advisory_xact_lock(:lockKey)")
                .setParameter("lockKey", CALENDAR_LOCK_KEY)
                .getSingleResult();
    }
}
