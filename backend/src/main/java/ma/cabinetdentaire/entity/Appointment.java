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

@Entity
@Table(name = "appointments")
public class Appointment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;
    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;
    @Column(nullable = false)
    private String reason;
    @Column(name = "treatment_type", length = 120)
    private String treatmentType;
    @Column(columnDefinition = "text")
    private String observations;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AppointmentStatus status;
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 40)
    private VerificationStatus verificationStatus;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @Column(name = "cancellation_reason", columnDefinition = "text")
    private String cancellationReason;
    @Column(name = "sms_requested", nullable = false)
    private boolean smsRequested = true;

    protected Appointment() {
    }

    public Appointment(Patient patient, Instant startsAt, Instant endsAt, String reason,
                       String treatmentType, String observations) {
        this.patient = patient;
        reschedule(startsAt, endsAt, reason, treatmentType, observations);
        this.status = AppointmentStatus.CONFIRME;
    }

    public void reschedule(Instant startsAt, Instant endsAt, String reason,
                           String treatmentType, String observations) {
        requireNonTerminal();
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.treatmentType = clean(treatmentType);
        String cleanedReason = clean(reason);
        this.reason = cleanedReason == null ? this.treatmentType : cleanedReason;
        this.observations = clean(observations);
        if (this.status == AppointmentStatus.PLANIFIE) {
            this.status = AppointmentStatus.CONFIRME;
        }
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }

    public void markArrived() {
        requireNonTerminal();
        this.status = AppointmentStatus.PATIENT_ARRIVE;
    }

    public void confirm() {
        requireNonTerminal();
        this.status = AppointmentStatus.CONFIRME;
    }

    public void cancel(Instant at, String reason) {
        requireNonTerminal();
        this.status = AppointmentStatus.ANNULE;
        this.cancelledAt = at;
        this.cancellationReason = clean(reason);
    }

    private void requireNonTerminal() {
        if (status != null && status.isTerminal()) {
            throw new IllegalStateException("A terminal appointment cannot be changed.");
        }
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public Patient getPatient() { return patient; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public String getReason() { return reason; }
    public String getTreatmentType() { return treatmentType; }
    public String getObservations() { return observations; }
    public AppointmentStatus getStatus() { return status; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
    public Instant getCancelledAt() { return cancelledAt; }
    public String getCancellationReason() { return cancellationReason; }
    public boolean isSmsRequested() { return smsRequested; }
}
