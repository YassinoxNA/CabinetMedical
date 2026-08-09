package ma.cabinetdentaire.dto;
import jakarta.validation.constraints.Size;import ma.cabinetdentaire.entity.VerificationRequest;import java.time.Instant;import java.util.UUID;
public final class VerificationModels {private VerificationModels(){}
 public record DecisionRequest(@Size(max=4000) String comment){}
 public record Response(UUID id,String entityType,UUID entityId,UUID patientId,UUID submittedBy,String status,String doctorComment,UUID verifiedBy,Instant verifiedAt,Instant createdAt){
  public static Response from(VerificationRequest v){return new Response(v.getId(),v.getEntityType(),v.getEntityId(),v.getPatientId(),v.getSubmittedBy(),v.getStatus().name(),v.getDoctorComment(),v.getVerifiedBy(),v.getVerifiedAt(),v.getCreatedAt());}}
}
