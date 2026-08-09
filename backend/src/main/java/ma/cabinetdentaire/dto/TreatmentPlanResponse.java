package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.TreatmentPlan;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TreatmentPlanResponse(
        UUID id, UUID patientId, String planNumber, String title, String status,
        String verificationStatus, LocalDate startDate, Instant completedAt,
        String notes, Instant createdAt, long version
) {
    public static TreatmentPlanResponse from(TreatmentPlan plan) {
        return new TreatmentPlanResponse(
                plan.getId(), plan.getPatient().getId(), plan.getPlanNumber(), plan.getTitle(),
                plan.getStatus().name(), plan.getVerificationStatus().name(), plan.getStartDate(),
                plan.getCompletedAt(), plan.getNotes(), plan.getCreatedAt(), plan.getVersion()
        );
    }
}
