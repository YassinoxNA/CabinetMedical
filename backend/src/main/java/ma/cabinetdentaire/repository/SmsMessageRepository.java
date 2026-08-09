package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.SmsMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SmsMessageRepository extends JpaRepository<SmsMessage, UUID> {
}
