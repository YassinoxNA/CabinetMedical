package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.AuditLogResponse;
import ma.cabinetdentaire.entity.AuditLog;
public final class AuditLogMapper {
    private AuditLogMapper() {}
    public static AuditLogResponse toResponse(AuditLog entity) { return AuditLogResponse.from(entity); }
}
