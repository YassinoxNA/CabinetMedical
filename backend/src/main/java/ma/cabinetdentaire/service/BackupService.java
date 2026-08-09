package ma.cabinetdentaire.service;

import ma.cabinetdentaire.config.BackupProperties;
import ma.cabinetdentaire.dto.BackupResponse;
import ma.cabinetdentaire.entity.BackupRecord;
import ma.cabinetdentaire.entity.User;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.mapper.BackupMapper;
import ma.cabinetdentaire.repository.BackupRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class BackupService {
    private final Object backupLock = new Object();
    private final BackupProperties properties;
    private final BackupRepository repository;
    private final AuditService audit;

    @Value("${DB_URL}")
    private String dbUrl;
    @Value("${DB_USERNAME}")
    private String username;
    @Value("${DB_PASSWORD}")
    private String password;

    public BackupService(BackupProperties properties, BackupRepository repository, AuditService audit) {
        this.properties = properties;
        this.repository = repository;
        this.audit = audit;
    }

    @Transactional
    public BackupResponse create(User actor, ClientRequestInfo client) {
        return createBackup(actor, client, "MANUELLE", true);
    }

    @Scheduled(fixedDelayString = "${app.backup.check-interval-ms:3600000}", initialDelay = 120000)
    public void createDailyBackupWhenNeeded() {
        boolean recentBackupExists = repository.findAllByOrderByStartedAtDesc().stream()
                .filter(record -> record.getStatus().startsWith("REUSSIE"))
                .findFirst()
                .map(record -> record.getStartedAt().isAfter(Instant.now().minus(Duration.ofHours(20))))
                .orElse(false);
        if (!recentBackupExists) createBackup(null, null, "AUTOMATIQUE", false);
    }

    @Transactional(readOnly = true)
    public List<BackupResponse> history() {
        return repository.findAllByOrderByStartedAtDesc().stream()
                .map(BackupMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Path downloadableFile(UUID id) {
        BackupRecord record = repository.findById(id)
                .orElseThrow(() -> new BusinessException("BACKUP_NOT_FOUND", "Sauvegarde introuvable.", HttpStatus.NOT_FOUND));
        if (!record.getStatus().startsWith("REUSSIE")) {
            throw new BusinessException("BACKUP_NOT_READY", "Cette sauvegarde n'est pas disponible.", HttpStatus.CONFLICT);
        }
        Path root = properties.directory().toAbsolutePath().normalize();
        Path file = Path.of(record.getFilePath()).toAbsolutePath().normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new BusinessException("BACKUP_NOT_FOUND", "Le fichier de sauvegarde est introuvable.", HttpStatus.NOT_FOUND);
        }
        return file;
    }

    public void restoreExisting(UUID id, User actor, ClientRequestInfo client) {
        Path file = downloadableFile(id);
        restoreDatabase(file, actor, client);
    }

    public void restoreUploaded(InputStream input, String originalName, long size, User actor, ClientRequestInfo client) {
        if (size <= 0 || size > 600L * 1024 * 1024) {
            throw new BusinessException("BACKUP_INVALID", "La taille du fichier de sauvegarde est invalide.", HttpStatus.BAD_REQUEST);
        }
        String safeName = originalName == null ? "sauvegarde.backup" : Path.of(originalName).getFileName().toString();
        if (!safeName.toLowerCase().endsWith(".backup")) {
            throw new BusinessException("BACKUP_INVALID", "Choisissez un fichier .backup.", HttpStatus.BAD_REQUEST);
        }
        try {
            Files.createDirectories(properties.directory());
            Path uploaded = properties.directory().resolve("restauration-" + LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")) + ".backup").toAbsolutePath().normalize();
            Files.copy(input, uploaded, StandardCopyOption.REPLACE_EXISTING);
            restoreDatabase(uploaded, actor, client);
        } catch (IOException exception) {
            throw new BusinessException("RESTORE_FAILED", "Impossible de préparer la restauration : " + exception.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void restoreDatabase(Path backup, User actor, ClientRequestInfo client) {
        synchronized (backupLock) {
            try {
                if (!Files.isRegularFile(backup)) throw new IOException("Fichier introuvable.");
                runPgRestore(backup, true);
                // Toujours créer une copie de l'état actuel avant toute opération destructive.
                doCreateBackup(actor, client, "MANUELLE", true);
                runPgRestore(backup, false);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new BusinessException("RESTORE_FAILED", "Restauration interrompue.", HttpStatus.INTERNAL_SERVER_ERROR);
            } catch (Exception exception) {
                throw new BusinessException("RESTORE_FAILED", "Restauration impossible : " + exception.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

    private BackupResponse createBackup(User actor, ClientRequestInfo client, String type, boolean propagateFailure) {
        synchronized (backupLock) {
            return doCreateBackup(actor, client, type, propagateFailure);
        }
    }

    private BackupResponse doCreateBackup(User actor, ClientRequestInfo client, String type, boolean propagateFailure) {
        BackupRecord record = null;
        try {
            Files.createDirectories(properties.directory());
            String name = "cabinet-" + LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")) + ".backup";
            Path output = properties.directory().resolve(name).toAbsolutePath();
            record = repository.save(new BackupRecord(output.toString(), actor == null ? null : actor.getId(), type));
            runPgDump(output);
            long size = Files.size(output);
            String checksum = sha256(output);
            String warning = copyToExternalDirectory(output);
            if (warning == null) record.success(size, checksum);
            else record.successWithWarning(size, checksum, warning);
            repository.save(record);
            cleanupOldBackups(properties.directory());
            if (actor != null) {
                audit.record(actor, "BACKUP_CREATED", "BACKUP", "BACKUP", record.getId(),
                        "Sauvegarde créée.", client);
            }
            return BackupMapper.toResponse(record);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return handleFailure(record, "Sauvegarde interrompue.", propagateFailure);
        } catch (Exception exception) {
            return handleFailure(record, "Impossible de créer la sauvegarde : " + exception.getMessage(), propagateFailure);
        }
    }

    private BackupResponse handleFailure(BackupRecord record, String message, boolean propagateFailure) {
        if (record != null) {
            record.fail(message);
            repository.save(record);
        }
        if (propagateFailure) {
            throw new BusinessException("BACKUP_FAILED", message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return record == null ? null : BackupMapper.toResponse(record);
    }

    private String copyToExternalDirectory(Path source) {
        Path configFile = properties.externalConfigFile();
        if (configFile == null || !Files.isRegularFile(configFile)) {
            return "Aucun emplacement externe configuré. La copie locale reste disponible.";
        }
        try {
            String configured = Files.readString(configFile, StandardCharsets.UTF_8).trim();
            if (configured.isBlank()) return "Aucun emplacement externe configuré. La copie locale reste disponible.";
            Path externalDirectory = Path.of(configured).toAbsolutePath().normalize();
            Files.createDirectories(externalDirectory);
            Files.copy(source, externalDirectory.resolve(source.getFileName()), StandardCopyOption.REPLACE_EXISTING);
            cleanupOldBackups(externalDirectory);
            return null;
        } catch (Exception exception) {
            return "Copie externe impossible (disque absent ou inaccessible) : " + exception.getMessage();
        }
    }

    private void cleanupOldBackups(Path directory) throws IOException {
        int keep = Math.max(1, properties.retentionCount());
        try (var files = Files.list(directory)) {
            List<Path> backups = files
                    .filter(path -> path.getFileName().toString().endsWith(".backup"))
                    .sorted((left, right) -> {
                        try {
                            return Files.getLastModifiedTime(right).compareTo(Files.getLastModifiedTime(left));
                        } catch (IOException ignored) {
                            return 0;
                        }
                    }).toList();
            for (int index = keep; index < backups.size(); index++) Files.deleteIfExists(backups.get(index));
        }
    }

    private void runPgDump(Path output) throws IOException, InterruptedException {
        String connection = dbUrl.startsWith("jdbc:") ? dbUrl.substring(5) : dbUrl;
        ProcessBuilder processBuilder = new ProcessBuilder(
                properties.pgDumpPath().toString(), "--format=custom", "--no-owner",
                "--username=" + username, "--file=" + output, connection);
        processBuilder.environment().put("PGPASSWORD", password);
        processBuilder.redirectErrorStream(true);
        Process process = processBuilder.start();
        String result = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (process.waitFor() != 0) {
            throw new BusinessException("BACKUP_FAILED",
                    "Échec de la sauvegarde PostgreSQL : " + result,
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void runPgRestore(Path backup, boolean validateOnly) throws IOException, InterruptedException {
        String connection = dbUrl.startsWith("jdbc:") ? dbUrl.substring(5) : dbUrl;
        List<String> command = new java.util.ArrayList<>();
        command.add(properties.pgRestorePath().toString());
        if (validateOnly) {
            command.add("--list");
        } else {
            command.addAll(List.of("--clean", "--if-exists", "--no-owner", "--no-privileges", "--exit-on-error",
                    "--username=" + username, "--dbname=" + connection));
        }
        command.add(backup.toString());
        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.environment().put("PGPASSWORD", password);
        processBuilder.redirectErrorStream(true);
        Process process = processBuilder.start();
        String result = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (process.waitFor() != 0) {
            throw new IOException(validateOnly ? "Le fichier .backup est endommagé ou incompatible."
                    : "Échec PostgreSQL : " + result);
        }
    }

    private String sha256(Path file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = Files.newInputStream(file)) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) > 0) digest.update(buffer, 0, count);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
