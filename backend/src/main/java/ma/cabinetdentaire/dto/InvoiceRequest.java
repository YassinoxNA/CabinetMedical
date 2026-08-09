package ma.cabinetdentaire.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.cabinetdentaire.entity.PatientInvoice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InvoiceRequest(
        @NotNull UUID patientId,
        @NotNull PatientInvoice.Type type,
        @NotNull LocalDate invoiceDate,
        @Size(max = 4000) String notes,
        @NotEmpty List<@Valid Item> items
) {
    public record Item(
            @NotBlank @Size(max = 255) String description,
            @Size(max = 30) String tooth,
            @NotNull @DecimalMin("0.01") BigDecimal quantity,
            @NotNull @DecimalMin("0.01") BigDecimal unitPrice
    ) {}
}
