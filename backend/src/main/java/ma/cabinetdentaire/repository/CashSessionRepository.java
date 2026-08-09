package ma.cabinetdentaire.repository;
import ma.cabinetdentaire.entity.CashSession;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface CashSessionRepository extends JpaRepository<CashSession,UUID>{Optional<CashSession> findFirstByStatus(CashSession.Status status);}
