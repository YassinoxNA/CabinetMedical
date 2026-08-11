package ma.cabinetdentaire.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "patient_payments")
public class PatientPayment {
    public enum Method { ESPECES, CARTE_BANCAIRE, VIREMENT, CHEQUE, AUTRE }
    @Id @GeneratedValue @UuidGenerator private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "patient_id")
    private Patient patient;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "invoice_id")
    private PatientInvoice invoice;
    @Column(name = "receipt_number", nullable = false, unique = true) private String receiptNumber;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(name = "payment_date", nullable = false) private Instant paymentDate;
    @Enumerated(EnumType.STRING) @Column(name = "payment_method", nullable = false)
    private Method paymentMethod;
    private String reference;
    @Column(columnDefinition = "text") private String notes;
    @Enumerated(EnumType.STRING) @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus;
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
    @Column(name = "cancelled_at") private Instant cancelledAt;
    @Column(name = "created_by") private UUID createdBy;
    @Version private long version;
    protected PatientPayment() {}
    public PatientPayment(PatientInvoice invoice, String receipt, BigDecimal amount, Instant date,
                          Method method, String reference, String notes, UUID actorId) {
        this.patient = invoice.getPatient(); this.invoice = invoice; this.receiptNumber = receipt;
        this.amount = amount; this.paymentDate = date; this.paymentMethod = method;
        this.reference = reference; this.notes = notes; this.createdBy = actorId;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }
    public UUID getId() { return id; }
    public Patient getPatient() { return patient; }
    public PatientInvoice getInvoice() { return invoice; }
    public String getReceiptNumber() { return receiptNumber; }
    public BigDecimal getAmount() { return amount; }
    public Instant getPaymentDate() { return paymentDate; }
    public Method getPaymentMethod() { return paymentMethod; }
    public String getReference() { return reference; }
    public String getNotes() { return notes; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
    public Instant getCancelledAt() { return cancelledAt; }
    public void cancel(Instant at) {
        if (cancelledAt == null) cancelledAt = at;
    }
}
