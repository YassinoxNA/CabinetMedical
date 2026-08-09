package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.BackupResponse;
import ma.cabinetdentaire.entity.BackupRecord;
public final class BackupMapper {
    private BackupMapper() {}
    public static BackupResponse toResponse(BackupRecord entity) { return BackupResponse.from(entity); }
}
