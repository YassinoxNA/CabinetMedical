package ma.cabinetdentaire.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "patient_invoices")
public class PatientInvoice extends BaseEntity {
    public enum Type { DEVIS, FACTURE, AVOIR }
    public enum Status { BROUILLON, VALIDEE, PARTIELLEMENT_PAYEE, SOLDEE, ANNULEE }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;
    @Column(name = "invoice_number", nullable = false, unique = true, length = 40)
    private String invoiceNumber;
    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_type", nullable = false, length = 20)
    private Type invoiceType;
    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Status status;
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;
    @Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount;
    @Column(name = "remaining_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal remainingAmount;
    @Column(columnDefinition = "text")
    private String notes;
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 40)
    private VerificationStatus verificationStatus;
    @Column(name = "validated_at")
    private Instant validatedAt;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PatientInvoiceItem> items = new ArrayList<>();

    protected PatientInvoice() {}

    public PatientInvoice(Patient patient, String number, Type type, LocalDate date, String notes) {
        this.patient = patient;
        this.invoiceNumber = number;
        this.invoiceType = type;
        this.invoiceDate = date;
        this.notes = notes;
        this.status = Status.BROUILLON;
        this.totalAmount = BigDecimal.ZERO;
        this.paidAmount = BigDecimal.ZERO;
        this.remainingAmount = BigDecimal.ZERO;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }

    public void addItem(String description, String tooth, BigDecimal quantity, BigDecimal unitPrice) {
        PatientInvoiceItem item = new PatientInvoiceItem(this, description, tooth, quantity, unitPrice);
        items.add(item);
        recalculate();
    }

    public void addConsultation(Consultation consultation, String description, String tooth, BigDecimal unitPrice) {
        PatientInvoiceItem item = new PatientInvoiceItem(
                this, consultation, description, tooth, BigDecimal.ONE, unitPrice);
        items.add(item);
        recalculate();
    }

    public void validate(Instant at) {
        if (items.isEmpty()) throw new IllegalStateException("Une facture doit contenir au moins une ligne.");
        this.status = Status.VALIDEE;
        this.validatedAt = at;
    }

    public void applyPayment(BigDecimal amount) {
        BigDecimal updated = paidAmount.add(amount);
        if (updated.compareTo(totalAmount) > 0) throw new IllegalArgumentException("Paiement supérieur au reste.");
        paidAmount = updated;
        remainingAmount = totalAmount.subtract(paidAmount);
        status = remainingAmount.signum() == 0 ? Status.SOLDEE : Status.PARTIELLEMENT_PAYEE;
    }

    private void recalculate() {
        totalAmount = items.stream().map(PatientInvoiceItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        remainingAmount = totalAmount.subtract(paidAmount);
    }

    public Patient getPatient() { return patient; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public Type getInvoiceType() { return invoiceType; }
    public LocalDate getInvoiceDate() { return invoiceDate; }
    public Status getStatus() { return status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public BigDecimal getRemainingAmount() { return remainingAmount; }
    public String getNotes() { return notes; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
    public Instant getValidatedAt() { return validatedAt; }
    public List<PatientInvoiceItem> getItems() { return List.copyOf(items); }
}
