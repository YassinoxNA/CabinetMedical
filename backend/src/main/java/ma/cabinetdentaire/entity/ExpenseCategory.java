package ma.cabinetdentaire.entity;
import jakarta.persistence.*;import org.hibernate.annotations.UuidGenerator;import java.util.UUID;
@Entity @Table(name="expense_categories")
public class ExpenseCategory {
 @Id @GeneratedValue @UuidGenerator private UUID id;@Column(nullable=false,unique=true,length=50) private String code;
 @Column(nullable=false,length=100) private String label;@Column(nullable=false) private boolean active;
 protected ExpenseCategory(){} public UUID getId(){return id;}public String getCode(){return code;}public String getLabel(){return label;}public boolean isActive(){return active;}
}
