package ma.cabinetdentaire.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
public record ExpenseRequest(@NotBlank @Size(max=50) String categoryCode,
        @NotBlank @Size(max=180) String label, @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotNull Instant expenseDate, @Size(max=180) String supplier,
        @NotBlank @Size(max=30) String paymentMethod, @Size(max=100) String reference,
        @Size(max=1000) String attachmentPath, @Size(max=4000) String notes) {}
