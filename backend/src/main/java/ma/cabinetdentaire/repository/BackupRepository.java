package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.BackupRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BackupRepository extends JpaRepository<BackupRecord, UUID> {
    List<BackupRecord> findAllByOrderByStartedAtDesc();
}
