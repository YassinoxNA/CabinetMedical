package ma.cabinetdentaire.repository;
import ma.cabinetdentaire.entity.LaboratoryJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface LaboratoryJobRepository extends JpaRepository<LaboratoryJob, UUID> {
    List<LaboratoryJob> findAllByPatientIdOrderByExpectedDateDesc(UUID patientId);
    List<LaboratoryJob> findAllByOrderByExpectedDateDesc();
}
