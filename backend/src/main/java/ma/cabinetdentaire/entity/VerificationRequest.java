package ma.cabinetdentaire.entity;
import jakarta.persistence.*;import ma.cabinetdentaire.entity.BaseEntity;import ma.cabinetdentaire.entity.VerificationStatus;
import java.time.Instant;import java.util.UUID;
@Entity @Table(name="verification_requests")
public class VerificationRequest extends BaseEntity {
 @Column(name="entity_type",nullable=false) private String entityType;@Column(name="entity_id",nullable=false) private UUID entityId;
 @Column(name="patient_id") private UUID patientId;@Column(name="submitted_by") private UUID submittedBy;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private VerificationStatus status;
 @Column(name="doctor_comment",columnDefinition="text") private String doctorComment;@Column(name="verified_by") private UUID verifiedBy;
 @Column(name="verified_at") private Instant verifiedAt;
 protected VerificationRequest(){}
 public VerificationRequest(String type,UUID entityId,UUID patientId,UUID submittedBy){entityType=type;this.entityId=entityId;this.patientId=patientId;this.submittedBy=submittedBy;status=VerificationStatus.EN_ATTENTE_VERIFICATION;}
 public void decide(VerificationStatus status,String comment,UUID doctor,Instant at){this.status=status;doctorComment=comment;verifiedBy=doctor;verifiedAt=at;}
 public String getEntityType(){return entityType;}public UUID getEntityId(){return entityId;}public UUID getPatientId(){return patientId;}
 public UUID getSubmittedBy(){return submittedBy;}public VerificationStatus getStatus(){return status;}public String getDoctorComment(){return doctorComment;}
 public UUID getVerifiedBy(){return verifiedBy;}public Instant getVerifiedAt(){return verifiedAt;}
}
