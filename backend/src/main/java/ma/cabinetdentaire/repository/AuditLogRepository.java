package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AuditLog> findAllByUserRoleAndModuleNotOrderByCreatedAtDesc(
            String userRole, String excludedModule, Pageable pageable);
}
