package ma.cabinetdentaire.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "backups")
public class BackupRecord {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;
    @Column(name = "file_path", nullable = false, columnDefinition = "text")
    private String filePath;
    @Column(name = "file_size")
    private Long fileSize;
    @Column(name = "checksum_sha256", length = 64)
    private String checksum;
    @Column(name = "backup_type", nullable = false)
    private String backupType;
    @Column(nullable = false)
    private String status;
    @Column(name = "started_at", nullable = false)
    private Instant startedAt;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "created_by")
    private UUID createdBy;
    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    protected BackupRecord() {
    }

    public BackupRecord(String path, UUID actor) {
        this(path, actor, "MANUELLE");
    }

    public BackupRecord(String path, UUID actor, String type) {
        filePath = path;
        backupType = type;
        status = "EN_COURS";
        startedAt = Instant.now();
        createdBy = actor;
    }

    public void success(long size, String checksum) {
        fileSize = size;
        this.checksum = checksum;
        status = "REUSSIE";
        completedAt = Instant.now();
    }

    public void successWithWarning(long size, String checksum, String warning) {
        fileSize = size;
        this.checksum = checksum;
        status = "REUSSIE_LOCALE";
        errorMessage = warning;
        completedAt = Instant.now();
    }

    public void fail(String error) {
        status = "ECHEC";
        errorMessage = error;
        completedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getFilePath() { return filePath; }
    public Long getFileSize() { return fileSize; }
    public String getChecksum() { return checksum; }
    public String getStatus() { return status; }
    public String getBackupType() { return backupType; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public String getErrorMessage() { return errorMessage; }
}
