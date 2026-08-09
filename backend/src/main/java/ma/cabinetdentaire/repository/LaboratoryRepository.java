package ma.cabinetdentaire.repository;
import ma.cabinetdentaire.entity.Laboratory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface LaboratoryRepository extends JpaRepository<Laboratory, UUID> {
    boolean existsByTaxIdentifier(String taxIdentifier);
}
