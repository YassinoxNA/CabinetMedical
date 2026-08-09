package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.PatientPayment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
        UUID id, UUID patientId, UUID invoiceId, String invoiceNumber, String receiptNumber,
        BigDecimal amount, Instant paymentDate, String paymentMethod, String reference,
        String notes, String verificationStatus
) {
    public static PaymentResponse from(PatientPayment p) {
        return new PaymentResponse(p.getId(), p.getPatient().getId(), p.getInvoice().getId(),
                p.getInvoice().getInvoiceNumber(), p.getReceiptNumber(), p.getAmount(),
                p.getPaymentDate(), p.getPaymentMethod().name(), p.getReference(), p.getNotes(),
                p.getVerificationStatus().name());
    }
}
