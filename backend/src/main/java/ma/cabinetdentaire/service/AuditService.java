package ma.cabinetdentaire.service;

import ma.cabinetdentaire.entity.AuditLog;
import ma.cabinetdentaire.repository.AuditLogRepository;
import ma.cabinetdentaire.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void record(User user, String action, String module, String entityType, UUID entityId,
                       String description, ClientRequestInfo client) {
        repository.save(new AuditLog(
                user,
                action,
                module,
                entityType,
                entityId,
                description,
                client == null ? null : client.workstation(),
                client == null ? null : client.localIp()
        ));
    }
}
