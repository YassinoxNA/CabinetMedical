package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.PatientPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PatientPaymentRepository extends JpaRepository<PatientPayment, UUID> {
    List<PatientPayment> findAllByPatientIdOrderByPaymentDateDesc(UUID patientId);
    boolean existsByInvoiceId(UUID invoiceId);
}
