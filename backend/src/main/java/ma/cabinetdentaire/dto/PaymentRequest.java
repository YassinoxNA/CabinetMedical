package ma.cabinetdentaire.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.cabinetdentaire.entity.PatientPayment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentRequest(
        @NotNull UUID invoiceId,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotNull Instant paymentDate,
        @NotNull PatientPayment.Method paymentMethod,
        @Size(max = 100) String reference,
        @Size(max = 4000) String notes
) {}
