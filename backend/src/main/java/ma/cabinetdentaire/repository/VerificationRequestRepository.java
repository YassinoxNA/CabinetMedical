package ma.cabinetdentaire.repository;
import ma.cabinetdentaire.entity.VerificationStatus;import ma.cabinetdentaire.entity.VerificationRequest;
import org.springframework.data.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface VerificationRequestRepository extends JpaRepository<VerificationRequest,UUID>{
 Page<VerificationRequest> findAllByStatusOrderByCreatedAtAsc(VerificationStatus status,Pageable pageable);
 Optional<VerificationRequest> findFirstByEntityTypeAndEntityIdOrderByCreatedAtDesc(String type,UUID entityId);
}
