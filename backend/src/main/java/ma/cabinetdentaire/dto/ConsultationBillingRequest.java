package ma.cabinetdentaire.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import ma.cabinetdentaire.entity.PatientPayment;

import java.math.BigDecimal;
import java.util.UUID;

public record ConsultationBillingRequest(
        @NotNull @Valid ConsultationRequest consultation,
        @NotNull BillingMode billingMode,
        UUID invoiceId,
        @NotNull @DecimalMin("0.00") BigDecimal amountPaid,
        @NotNull PatientPayment.Method paymentMethod
) {
    public enum BillingMode {
        NOUVEAU_SOIN,
        VISITE_SUIVI
    }
}
