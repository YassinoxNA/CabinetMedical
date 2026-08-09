package ma.cabinetdentaire.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "treatment_plans")
public class TreatmentPlan extends BaseEntity {
    public enum Status { EN_COURS, EN_ATTENTE, TERMINE, ANNULE }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;
    @Column(name = "plan_number", nullable = false, unique = true, length = 40)
    private String planNumber;
    @Column(nullable = false, length = 180)
    private String title;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Status status;
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 40)
    private VerificationStatus verificationStatus;
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(columnDefinition = "text")
    private String notes;
    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected TreatmentPlan() {}

    public TreatmentPlan(Patient patient, String planNumber, String title, LocalDate startDate, String notes) {
        this.patient = patient;
        this.planNumber = planNumber;
        this.title = title.trim();
        this.startDate = startDate;
        this.notes = notes == null || notes.isBlank() ? null : notes.trim();
        this.status = Status.EN_COURS;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }

    public void complete(Instant at) {
        this.status = Status.TERMINE;
        this.completedAt = at;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }

    public Patient getPatient() { return patient; }
    public String getPlanNumber() { return planNumber; }
    public String getTitle() { return title; }
    public Status getStatus() { return status; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
    public LocalDate getStartDate() { return startDate; }
    public Instant getCompletedAt() { return completedAt; }
    public String getNotes() { return notes; }
}
