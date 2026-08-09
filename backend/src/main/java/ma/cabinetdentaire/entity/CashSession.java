package ma.cabinetdentaire.entity;
import jakarta.persistence.*;import ma.cabinetdentaire.entity.User;import org.hibernate.annotations.UuidGenerator;import java.math.BigDecimal;import java.time.Instant;import java.util.UUID;
@Entity @Table(name="cash_sessions")
public class CashSession {
 public enum Status{OUVERTE,FERMEE}
 @Id @GeneratedValue @UuidGenerator private UUID id;@Column(name="opened_at",nullable=false) private Instant openedAt;
 @Column(name="closed_at") private Instant closedAt;@Column(name="opening_balance",nullable=false,precision=12,scale=2) private BigDecimal openingBalance;
 @Column(name="closing_balance",precision=12,scale=2) private BigDecimal closingBalance;@Enumerated(EnumType.STRING) @Column(nullable=false) private Status status;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="responsible_user_id") private User responsibleUser;@Version private long version;
 protected CashSession(){}public CashSession(BigDecimal opening,User user,Instant at){openingBalance=opening;responsibleUser=user;openedAt=at;status=Status.OUVERTE;}
 public void close(BigDecimal balance,Instant at){closingBalance=balance;closedAt=at;status=Status.FERMEE;}
 public UUID getId(){return id;}public Instant getOpenedAt(){return openedAt;}public Instant getClosedAt(){return closedAt;}public BigDecimal getOpeningBalance(){return openingBalance;}
 public BigDecimal getClosingBalance(){return closingBalance;}public Status getStatus(){return status;}public User getResponsibleUser(){return responsibleUser;}
}
