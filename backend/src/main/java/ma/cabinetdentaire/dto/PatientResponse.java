package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.Patient;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record PatientResponse(
        UUID id, String patientNumber, String firstName, String lastName, String fullName,
        String cin, String primaryPhone, String secondaryPhone, String address, String city,
        LocalDate birthDate, String sex, String email, String coverageType,
        String membershipNumber, String allergies, String medicalHistory, String observations,
        String fileStatus, String verificationStatus, Instant lastVisitAt,
        Instant archivedAt, Instant createdAt, Instant updatedAt, long version
) {
    public static PatientResponse from(Patient p) {
        return new PatientResponse(
                p.getId(), p.getPatientNumber(), p.getFirstName(), p.getLastName(),
                p.getFirstName() + " " + p.getLastName(), p.getCin(), p.getPrimaryPhone(),
                p.getSecondaryPhone(), p.getAddress(), p.getCity(), p.getBirthDate(), p.getSex(),
                p.getEmail(), p.getCoverageType().name(), p.getMembershipNumber(), p.getAllergies(),
                p.getMedicalHistory(), p.getObservations(), p.getFileStatus().name(),
                p.getVerificationStatus().name(), p.getLastVisitAt(), p.getArchivedAt(),
                p.getCreatedAt(), p.getUpdatedAt(), p.getVersion()
        );
    }
}
