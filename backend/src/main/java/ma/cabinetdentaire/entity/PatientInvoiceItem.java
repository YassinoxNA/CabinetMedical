package ma.cabinetdentaire.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "patient_invoice_items")
public class PatientInvoiceItem {
    @Id @GeneratedValue @UuidGenerator
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id")
    private PatientInvoice invoice;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id")
    private Consultation consultation;
    @Column(nullable = false)
    private String description;
    @Column(length = 30)
    private String tooth;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;
    @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal lineTotal;

    protected PatientInvoiceItem() {}
    PatientInvoiceItem(PatientInvoice invoice, String description, String tooth,
                       BigDecimal quantity, BigDecimal unitPrice) {
        this(invoice, null, description, tooth, quantity, unitPrice);
    }
    PatientInvoiceItem(PatientInvoice invoice, Consultation consultation, String description, String tooth,
                       BigDecimal quantity, BigDecimal unitPrice) {
        this.invoice = invoice;
        this.consultation = consultation;
        this.description = description.trim();
        this.tooth = tooth;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.lineTotal = quantity.multiply(unitPrice);
    }
    public UUID getId() { return id; }
    public Consultation getConsultation() { return consultation; }
    public String getDescription() { return description; }
    public String getTooth() { return tooth; }
    public BigDecimal getQuantity() { return quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public BigDecimal getLineTotal() { return lineTotal; }
}
