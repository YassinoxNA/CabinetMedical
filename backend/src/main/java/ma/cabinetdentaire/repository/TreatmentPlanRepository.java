package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.TreatmentPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TreatmentPlanRepository extends JpaRepository<TreatmentPlan, UUID> {
    List<TreatmentPlan> findAllByPatientIdAndDeletedAtIsNullOrderByStartDateDesc(UUID patientId);
}
