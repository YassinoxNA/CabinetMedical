package ma.cabinetdentaire.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity @Table(name="supplier_invoices", uniqueConstraints=@UniqueConstraint(columnNames={"laboratory_id","invoice_number"}))
public class SupplierInvoice extends BaseEntity {
    public enum Status { NON_PAYEE, PARTIELLEMENT_PAYEE, SOLDEE, EN_RETARD, ANNULEE }
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="laboratory_id") private Laboratory laboratory;
    @Column(name="invoice_number",nullable=false,length=80) private String invoiceNumber;
    @Column(name="invoice_date",nullable=false) private LocalDate invoiceDate;
    @Column(name="due_date") private LocalDate dueDate;
    @Column(name="total_amount",nullable=false,precision=12,scale=2) private BigDecimal totalAmount;
    @Column(name="paid_amount",nullable=false,precision=12,scale=2) private BigDecimal paidAmount;
    @Column(name="remaining_amount",nullable=false,precision=12,scale=2) private BigDecimal remainingAmount;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Status status;
    @Column(name="attachment_path",columnDefinition="text") private String attachmentPath;
    @Column(columnDefinition="text") private String notes;
    @Enumerated(EnumType.STRING) @Column(name="verification_status",nullable=false) private VerificationStatus verificationStatus;
    protected SupplierInvoice(){}
    public SupplierInvoice(Laboratory lab,String number,LocalDate date,LocalDate due,BigDecimal total,String attachment,String notes){
        laboratory=lab;invoiceNumber=number.trim();invoiceDate=date;dueDate=due;totalAmount=total;paidAmount=BigDecimal.ZERO;
        remainingAmount=total;status=due!=null&&due.isBefore(LocalDate.now())?Status.EN_RETARD:Status.NON_PAYEE;
        attachmentPath=attachment;this.notes=notes;verificationStatus=VerificationStatus.EN_ATTENTE_VERIFICATION;
    }
    public void pay(BigDecimal amount){BigDecimal next=paidAmount.add(amount);if(next.compareTo(totalAmount)>0)throw new IllegalArgumentException("Paiement supérieur au reste fournisseur.");
        paidAmount=next;remainingAmount=totalAmount.subtract(next);status=remainingAmount.signum()==0?Status.SOLDEE:Status.PARTIELLEMENT_PAYEE;}
    public Laboratory getLaboratory(){return laboratory;} public String getInvoiceNumber(){return invoiceNumber;}
    public LocalDate getInvoiceDate(){return invoiceDate;} public LocalDate getDueDate(){return dueDate;}
    public BigDecimal getTotalAmount(){return totalAmount;} public BigDecimal getPaidAmount(){return paidAmount;}
    public BigDecimal getRemainingAmount(){return remainingAmount;} public Status getStatus(){return status;}
    public String getAttachmentPath(){return attachmentPath;} public String getNotes(){return notes;}
    public VerificationStatus getVerificationStatus(){return verificationStatus;}
}
