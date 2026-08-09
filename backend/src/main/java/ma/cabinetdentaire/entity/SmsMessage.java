package ma.cabinetdentaire.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sms_messages")
public class SmsMessage {
    public enum Status { EN_ATTENTE, ENVOYE, ECHEC }
    public enum Type { CREATION, MODIFICATION, ANNULATION }

    @Id @GeneratedValue @UuidGenerator
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;
    @Column(name = "phone_number", nullable = false, length = 30)
    private String phoneNumber;
    @Column(nullable = false, columnDefinition = "text")
    private String message;
    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 30)
    private Type messageType;
    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;
    @Column(name = "sent_at")
    private Instant sentAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Status status = Status.EN_ATTENTE;
    @Column(name = "provider_response", columnDefinition = "text")
    private String providerResponse;
    @Column(name = "retry_count", nullable = false)
    private int retryCount;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "created_by")
    private UUID createdBy;
    @Version @Column(nullable = false)
    private long version;

    protected SmsMessage() {}

    public SmsMessage(Patient patient, Appointment appointment, String phoneNumber,
                      String message, Type messageType, UUID createdBy) {
        this.patient = patient;
        this.appointment = appointment;
        this.phoneNumber = phoneNumber;
        this.message = message;
        this.messageType = messageType;
        this.scheduledAt = Instant.now();
        this.createdBy = createdBy;
    }

    public void markSent(String response) {
        status = Status.ENVOYE;
        sentAt = Instant.now();
        providerResponse = response;
        retryCount++;
    }

    public void markFailed(String error) {
        status = Status.ECHEC;
        providerResponse = error;
        retryCount++;
    }
}
