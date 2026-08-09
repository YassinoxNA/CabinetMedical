package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.PatientInvoice;
import ma.cabinetdentaire.entity.PatientInvoiceItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        UUID id, UUID patientId, String patientNumber, String patientName,
        String invoiceNumber, String type, LocalDate invoiceDate, String status,
        BigDecimal totalAmount, BigDecimal paidAmount, BigDecimal remainingAmount,
        String notes, String verificationStatus, Instant validatedAt, List<Item> items, long version
) {
    public record Item(UUID id, String description, String tooth, BigDecimal quantity,
                       BigDecimal unitPrice, BigDecimal lineTotal) {
        static Item from(PatientInvoiceItem i) {
            return new Item(i.getId(), i.getDescription(), i.getTooth(), i.getQuantity(),
                    i.getUnitPrice(), i.getLineTotal());
        }
    }
    public static InvoiceResponse from(PatientInvoice invoice) {
        var patient = invoice.getPatient();
        return new InvoiceResponse(
                invoice.getId(), patient.getId(), patient.getPatientNumber(),
                patient.getFirstName() + " " + patient.getLastName(), invoice.getInvoiceNumber(),
                invoice.getInvoiceType().name(), invoice.getInvoiceDate(), invoice.getStatus().name(),
                invoice.getTotalAmount(), invoice.getPaidAmount(), invoice.getRemainingAmount(),
                invoice.getNotes(), invoice.getVerificationStatus().name(), invoice.getValidatedAt(),
                invoice.getItems().stream().map(Item::from).toList(), invoice.getVersion()
        );
    }
}
