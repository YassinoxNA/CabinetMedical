package ma.cabinetdentaire.dto;
import ma.cabinetdentaire.entity.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public final class LaboratoryResponses {
    private LaboratoryResponses() {}
    public record LaboratoryResponse(UUID id, String name, String managerName, String phone, String email,
        String address, String city, String taxIdentifier, String observations, boolean active) {
        public static LaboratoryResponse from(Laboratory l) { return new LaboratoryResponse(l.getId(), l.getName(),
            l.getManagerName(), l.getPhone(), l.getEmail(), l.getAddress(), l.getCity(), l.getTaxIdentifier(),
            l.getObservations(), l.isActive()); }
    }
    public record JobResponse(UUID id, UUID laboratoryId, String laboratoryName, UUID patientId,
        String patientNumber, String patientName, String jobType, String tooth, String shade, String description,
        LocalDate sentDate, LocalDate expectedDate, LocalDate receivedDate, BigDecimal laboratoryPrice,
        String status, String notes, String verificationStatus) {
        public static JobResponse from(LaboratoryJob j) { return new JobResponse(j.getId(), j.getLaboratory().getId(),
            j.getLaboratory().getName(), j.getPatient().getId(), j.getPatient().getPatientNumber(),
            j.getPatient().getFirstName() + " " + j.getPatient().getLastName(), j.getJobType(),
            j.getTooth(), j.getShade(), j.getDescription(), j.getSentDate(), j.getExpectedDate(), j.getReceivedDate(),
            j.getLaboratoryPrice(), j.getStatus().name(), j.getNotes(), j.getVerificationStatus().name()); }
    }
    public record EligiblePatientTreatmentResponse(UUID patientId, String patientNumber, String firstName,
        String lastName, String cin, String primaryPhone, String treatmentType) {}
}
