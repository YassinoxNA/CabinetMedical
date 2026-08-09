package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.AuditLog;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID userId,
        String username,
        String userRole,
        String action,
        String module,
        String entityType,
        UUID entityId,
        String description,
        String workstation,
        String localIp,
        Instant createdAt
) {
    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId(), log.getUserId(), log.getUsername(), log.getUserRole(),
                log.getAction(), log.getModule(), log.getEntityType(), log.getEntityId(),
                log.getDescription(), log.getWorkstation(), log.getLocalIp(), log.getCreatedAt()
        );
    }
}
