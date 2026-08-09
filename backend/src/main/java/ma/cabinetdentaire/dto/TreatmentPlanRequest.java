package ma.cabinetdentaire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record TreatmentPlanRequest(
        @NotBlank @Size(max = 180) String title,
        @NotNull LocalDate startDate,
        @Size(max = 8000) String notes
) {
}
