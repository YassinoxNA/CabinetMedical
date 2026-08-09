package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.BackupRecord;

import java.time.Instant;
import java.util.UUID;

public record BackupResponse(
        UUID id,
        String filePath,
        Long fileSize,
        String checksum,
        String backupType,
        String status,
        Instant startedAt,
        Instant completedAt,
        String errorMessage
) {
    public static BackupResponse from(BackupRecord record) {
        return new BackupResponse(record.getId(), record.getFilePath(), record.getFileSize(),
                record.getChecksum(), record.getBackupType(), record.getStatus(), record.getStartedAt(),
                record.getCompletedAt(), record.getErrorMessage());
    }
}
