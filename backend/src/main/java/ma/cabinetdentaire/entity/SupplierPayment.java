package ma.cabinetdentaire.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import java.math.BigDecimal;import java.time.Instant;import java.util.UUID;
@Entity @Table(name="supplier_payments")
public class SupplierPayment {
    @Id @GeneratedValue @UuidGenerator private UUID id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="laboratory_id") private Laboratory laboratory;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="supplier_invoice_id") private SupplierInvoice invoice;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal amount;
    @Column(name="payment_date",nullable=false) private Instant paymentDate;
    @Column(name="payment_method",nullable=false,length=30) private String paymentMethod;
    private String reference;@Column(columnDefinition="text") private String notes;
    @Enumerated(EnumType.STRING) @Column(name="verification_status",nullable=false) private VerificationStatus verificationStatus;
    @CreationTimestamp @Column(name="created_at",updatable=false) private Instant createdAt;
    @Column(name="created_by") private UUID createdBy;@Version private long version;
    protected SupplierPayment(){}
    public SupplierPayment(SupplierInvoice invoice,BigDecimal amount,Instant date,String method,String ref,String notes,UUID actor){
        this.invoice=invoice;laboratory=invoice.getLaboratory();this.amount=amount;paymentDate=date;paymentMethod=method;
        reference=ref;this.notes=notes;createdBy=actor;verificationStatus=VerificationStatus.EN_ATTENTE_VERIFICATION;}
    public UUID getId(){return id;} public Laboratory getLaboratory(){return laboratory;} public SupplierInvoice getInvoice(){return invoice;}
    public BigDecimal getAmount(){return amount;} public Instant getPaymentDate(){return paymentDate;} public String getPaymentMethod(){return paymentMethod;}
    public String getReference(){return reference;} public String getNotes(){return notes;} public VerificationStatus getVerificationStatus(){return verificationStatus;}
}
