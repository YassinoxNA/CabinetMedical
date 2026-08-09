package ma.cabinetdentaire.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;

@ConfigurationProperties(prefix = "app.backup")
public record BackupProperties(
        Path pgDumpPath,
        Path pgRestorePath,
        Path directory,
        Path externalConfigFile,
        int retentionCount
) {
}
