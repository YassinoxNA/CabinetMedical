package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.Role;
import ma.cabinetdentaire.entity.RoleCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByCode(RoleCode code);
}
