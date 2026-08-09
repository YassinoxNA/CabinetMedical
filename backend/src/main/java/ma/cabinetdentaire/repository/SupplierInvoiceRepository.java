package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.SupplierInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupplierInvoiceRepository extends JpaRepository<SupplierInvoice, UUID> {
    List<SupplierInvoice> findAllByLaboratoryIdOrderByInvoiceDateDesc(UUID laboratoryId);
}
