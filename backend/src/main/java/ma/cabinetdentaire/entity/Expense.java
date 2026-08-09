package ma.cabinetdentaire.entity;
import jakarta.persistence.*;import org.hibernate.annotations.CreationTimestamp;import org.hibernate.annotations.UuidGenerator;import java.math.BigDecimal;import java.time.Instant;import java.util.UUID;
@Entity @Table(name="expenses")
public class Expense {
 @Id @GeneratedValue @UuidGenerator private UUID id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="category_id") private ExpenseCategory category;
 @Column(nullable=false,length=180) private String label;@Column(nullable=false,precision=12,scale=2) private BigDecimal amount;
 @Column(name="expense_date",nullable=false) private Instant expenseDate;@Column(length=180) private String supplier;
 @Column(name="payment_method",nullable=false,length=30) private String paymentMethod;@Column(length=100) private String reference;
 @Column(name="attachment_path",columnDefinition="text") private String attachmentPath;@Column(columnDefinition="text") private String notes;
 @CreationTimestamp @Column(name="created_at",updatable=false) private Instant createdAt;@Column(name="created_by") private UUID createdBy;@Version private long version;
 protected Expense(){} public Expense(ExpenseCategory c,String label,BigDecimal amount,Instant date,String supplier,String method,String ref,String attachment,String notes,UUID actor){
  category=c;this.label=label.trim();this.amount=amount;expenseDate=date;this.supplier=supplier;paymentMethod=method;reference=ref;attachmentPath=attachment;this.notes=notes;createdBy=actor;}
 public UUID getId(){return id;}public ExpenseCategory getCategory(){return category;}public String getLabel(){return label;}public BigDecimal getAmount(){return amount;}
 public Instant getExpenseDate(){return expenseDate;}public String getSupplier(){return supplier;}public String getPaymentMethod(){return paymentMethod;}
 public String getReference(){return reference;}public String getAttachmentPath(){return attachmentPath;}public String getNotes(){return notes;}
}
