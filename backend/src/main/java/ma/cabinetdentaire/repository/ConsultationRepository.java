package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {
    List<Consultation> findAllByPatientIdAndDeletedAtIsNullOrderByConsultationAtDesc(UUID patientId);
    boolean existsByPatientIdAndDeletedAtIsNull(UUID patientId);
    Optional<Consultation> findFirstByPatientIdAndDeletedAtIsNullOrderByConsultationAtDesc(UUID patientId);
}
