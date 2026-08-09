package ma.cabinetdentaire.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(length = 80)
    private String username;

    @Column(name = "user_role", length = 40)
    private String userRole;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 80)
    private String module;

    @Column(name = "entity_type", length = 100)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "patient_id")
    private UUID patientId;

    @Column(name = "old_value", columnDefinition = "text")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "text")
    private String newValue;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(length = 160)
    private String workstation;

    @Column(name = "local_ip", length = 64)
    private String localIp;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditLog() {
    }

    public AuditLog(User user, String action, String module, String entityType, UUID entityId,
                    String description, String workstation, String localIp) {
        if (user != null) {
            this.userId = user.getId();
            this.username = user.getUsername();
            this.userRole = user.getRole().getCode().name();
        }
        this.action = action;
        this.module = module;
        this.entityType = entityType;
        this.entityId = entityId;
        this.description = description;
        this.workstation = workstation;
        this.localIp = localIp;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getUserRole() {
        return userRole;
    }

    public String getAction() {
        return action;
    }

    public String getModule() {
        return module;
    }

    public String getEntityType() {
        return entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public String getDescription() {
        return description;
    }

    public String getWorkstation() {
        return workstation;
    }

    public String getLocalIp() {
        return localIp;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
