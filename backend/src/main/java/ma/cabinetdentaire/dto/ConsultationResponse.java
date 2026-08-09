package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.Consultation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ConsultationResponse(
        UUID id, UUID patientId, UUID treatmentPlanId, Instant consultationAt,
        String reason, String diagnosis, String diseaseType, String tooth,
        String treatmentPerformed, String observations, String prescription,
        BigDecimal price, String treatmentStatus, String verificationStatus,
        Instant createdAt, long version
) {
    public static ConsultationResponse from(Consultation c) {
        return new ConsultationResponse(
                c.getId(), c.getPatient().getId(),
                c.getTreatmentPlan() == null ? null : c.getTreatmentPlan().getId(),
                c.getConsultationAt(), c.getReason(), c.getDiagnosis(), c.getDiseaseType(),
                c.getTooth(), c.getTreatmentPerformed(), c.getObservations(), c.getPrescription(),
                c.getPrice(), c.getTreatmentStatus().name(), c.getVerificationStatus().name(),
                c.getCreatedAt(), c.getVersion()
        );
    }
}
