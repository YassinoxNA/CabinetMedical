package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.Appointment;

import java.time.Instant;
import java.util.UUID;

public record AppointmentResponse(
        UUID id, UUID patientId, String patientNumber, String patientName, String phone,
        Instant startsAt, Instant endsAt, String reason, String treatmentType,
        String observations, String status, String verificationStatus,
        Instant cancelledAt, String cancellationReason, long version
) {
    public static AppointmentResponse from(Appointment appointment) {
        var patient = appointment.getPatient();
        return new AppointmentResponse(
                appointment.getId(), patient.getId(), patient.getPatientNumber(),
                patient.getFirstName() + " " + patient.getLastName(), patient.getPrimaryPhone(),
                appointment.getStartsAt(), appointment.getEndsAt(), appointment.getReason(),
                appointment.getTreatmentType(), appointment.getObservations(),
                appointment.getStatus().name(), appointment.getVerificationStatus().name(),
                appointment.getCancelledAt(),
                appointment.getCancellationReason(), appointment.getVersion()
        );
    }
}
