package ma.cabinetdentaire.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "laboratory_jobs")
public class LaboratoryJob extends BaseEntity {
    public enum Status { A_PREPARER, ENVOYE, EN_COURS, PRET, RECU, POSE_AU_PATIENT, A_REFAIRE, ANNULE, TERMINE }
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "laboratory_id")
    private Laboratory laboratory;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "patient_id")
    private Patient patient;
    @Column(name = "job_type", nullable = false, length = 100) private String jobType;
    @Column(length = 30) private String tooth;
    @Column(length = 40) private String shade;
    @Column(columnDefinition = "text") private String description;
    @Column(name = "sent_date") private LocalDate sentDate;
    @Column(name = "expected_date") private LocalDate expectedDate;
    @Column(name = "received_date") private LocalDate receivedDate;
    @Column(name = "laboratory_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal laboratoryPrice;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(columnDefinition = "text") private String notes;
    @Enumerated(EnumType.STRING) @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus;
    protected LaboratoryJob() {}
    public LaboratoryJob(Laboratory laboratory, Patient patient, String jobType, String tooth,
                         String shade, String description, LocalDate sentDate, LocalDate expectedDate,
                         BigDecimal price, String notes) {
        this.laboratory = laboratory; this.patient = patient; this.jobType = jobType.trim();
        this.tooth = tooth; this.shade = shade; this.description = description; this.sentDate = sentDate;
        this.expectedDate = expectedDate; this.laboratoryPrice = price; this.notes = notes;
        this.status = sentDate == null ? Status.A_PREPARER : Status.ENVOYE;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }
    public void changeStatus(Status status) {
        this.status = status;
        if (status == Status.RECU && receivedDate == null) receivedDate = LocalDate.now();
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }
    public void update(Laboratory laboratory, Patient patient, String jobType, String tooth,
                       String shade, String description, LocalDate sentDate, LocalDate expectedDate,
                       BigDecimal price, String notes) {
        this.laboratory = laboratory;
        this.patient = patient;
        this.jobType = jobType.trim();
        this.tooth = tooth;
        this.shade = shade;
        this.description = description;
        this.sentDate = sentDate;
        this.expectedDate = expectedDate;
        this.laboratoryPrice = price;
        this.notes = notes;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }
    public Laboratory getLaboratory() { return laboratory; } public Patient getPatient() { return patient; }
    public String getJobType() { return jobType; } public String getTooth() { return tooth; }
    public String getShade() { return shade; } public String getDescription() { return description; }
    public LocalDate getSentDate() { return sentDate; } public LocalDate getExpectedDate() { return expectedDate; }
    public LocalDate getReceivedDate() { return receivedDate; } public BigDecimal getLaboratoryPrice() { return laboratoryPrice; }
    public Status getStatus() { return status; } public String getNotes() { return notes; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
}
