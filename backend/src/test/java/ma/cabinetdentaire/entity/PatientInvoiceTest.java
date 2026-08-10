package ma.cabinetdentaire.entity;

import ma.cabinetdentaire.entity.CoverageType;
import ma.cabinetdentaire.entity.Patient;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PatientInvoiceTest {
    private PatientInvoice invoice() {
        Patient patient = new Patient("PAT-1", "Amine", "Test", "AA1",
                "0600000000", LocalDate.of(1990, 1, 1), CoverageType.SANS_ASSURANCE);
        PatientInvoice invoice = new PatientInvoice(patient, "FAC-2026-1",
                PatientInvoice.Type.FACTURE, LocalDate.of(2026, 7, 27), null);
        invoice.addItem("Consultation", "16", new BigDecimal("2"), new BigDecimal("250"));
        return invoice;
    }

    @Test
    void calculatesTotalsAndPartialPayment() {
        PatientInvoice invoice = invoice();
        invoice.validate(Instant.parse("2026-07-27T10:00:00Z"));
        invoice.applyPayment(new BigDecimal("200"));

        assertEquals(new BigDecimal("500"), invoice.getTotalAmount());
        assertEquals(new BigDecimal("200"), invoice.getPaidAmount());
        assertEquals(new BigDecimal("300"), invoice.getRemainingAmount());
        assertEquals(PatientInvoice.Status.PARTIELLEMENT_PAYEE, invoice.getStatus());
    }

    @Test
    void becomesSettledWhenFullyPaid() {
        PatientInvoice invoice = invoice();
        invoice.validate(Instant.now());
        invoice.applyPayment(new BigDecimal("500"));
        assertEquals(PatientInvoice.Status.SOLDEE, invoice.getStatus());
    }

    @Test
    void rejectsOverpayment() {
        PatientInvoice invoice = invoice();
        assertThrows(IllegalArgumentException.class,
                () -> invoice.applyPayment(new BigDecimal("500.01")));
    }

    @Test
    void rejectsValidationWithoutItems() {
        Patient patient = new Patient("PAT-2", "Sara", "Test", null,
                "0600000001", LocalDate.of(1992, 1, 1), CoverageType.SANS_ASSURANCE);
        PatientInvoice invoice = new PatientInvoice(patient, "FAC-2026-2",
                PatientInvoice.Type.FACTURE, LocalDate.now(), null);
        assertThrows(IllegalStateException.class, () -> invoice.validate(Instant.now()));
    }

    @Test
    void updatesOnlyDraftAndRecalculatesItems() {
        PatientInvoice invoice = invoice();
        invoice.updateDraft(PatientInvoice.Type.DEVIS, LocalDate.of(2026, 8, 10), "Mise a jour");
        invoice.addItem("Couronne", "26", BigDecimal.ONE, new BigDecimal("700"));

        assertEquals(PatientInvoice.Type.DEVIS, invoice.getInvoiceType());
        assertEquals(LocalDate.of(2026, 8, 10), invoice.getInvoiceDate());
        assertEquals(new BigDecimal("700"), invoice.getTotalAmount());
        assertEquals(1, invoice.getItems().size());
    }

    @Test
    void rejectsUpdateAfterValidation() {
        PatientInvoice invoice = invoice();
        invoice.validate(Instant.now());

        assertThrows(IllegalStateException.class, () -> invoice.updateDraft(
                PatientInvoice.Type.DEVIS, LocalDate.now(), null));
    }
}
