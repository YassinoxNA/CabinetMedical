package ma.cabinetdentaire.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "consultations")
public class Consultation extends BaseEntity {
    public enum Status { EN_COURS, TERMINE, SUIVI_NECESSAIRE }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "treatment_plan_id")
    private TreatmentPlan treatmentPlan;
    @Column(name = "consultation_at", nullable = false)
    private Instant consultationAt;
    private String reason;
    @Column(columnDefinition = "text")
    private String diagnosis;
    @Column(name = "disease_type", length = 120)
    private String diseaseType;
    @Column(length = 30)
    private String tooth;
    @Column(name = "treatment_performed", columnDefinition = "text")
    private String treatmentPerformed;
    @Column(columnDefinition = "text")
    private String observations;
    @Column(columnDefinition = "text")
    private String prescription;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;
    @Enumerated(EnumType.STRING)
    @Column(name = "treatment_status", nullable = false, length = 40)
    private Status treatmentStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 40)
    private VerificationStatus verificationStatus;
    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Consultation() {}

    public Consultation(Patient patient, TreatmentPlan plan, Instant at, String reason,
                        String diagnosis, String diseaseType, String tooth,
                        String treatmentPerformed, String observations, String prescription,
                        BigDecimal price, Status status) {
        this.patient = patient;
        this.treatmentPlan = plan;
        this.consultationAt = at;
        this.reason = clean(reason);
        this.diagnosis = clean(diagnosis);
        this.diseaseType = clean(diseaseType);
        this.tooth = clean(tooth);
        this.treatmentPerformed = clean(treatmentPerformed);
        this.observations = clean(observations);
        this.prescription = clean(prescription);
        this.price = price;
        this.treatmentStatus = status;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    public Patient getPatient() { return patient; }
    public TreatmentPlan getTreatmentPlan() { return treatmentPlan; }
    public Instant getConsultationAt() { return consultationAt; }
    public String getReason() { return reason; }
    public String getDiagnosis() { return diagnosis; }
    public String getDiseaseType() { return diseaseType; }
    public String getTooth() { return tooth; }
    public String getTreatmentPerformed() { return treatmentPerformed; }
    public String getObservations() { return observations; }
    public String getPrescription() { return prescription; }
    public BigDecimal getPrice() { return price; }
    public Status getTreatmentStatus() { return treatmentStatus; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
}
