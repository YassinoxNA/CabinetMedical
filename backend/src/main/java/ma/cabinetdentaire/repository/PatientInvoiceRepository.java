package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.PatientInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PatientInvoiceRepository extends JpaRepository<PatientInvoice, UUID> {
    List<PatientInvoice> findAllByPatientIdOrderByInvoiceDateDesc(UUID patientId);
    boolean existsByItemsConsultationId(UUID consultationId);
}
