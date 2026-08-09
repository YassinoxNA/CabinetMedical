package ma.cabinetdentaire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelAppointmentRequest(@NotBlank @Size(max = 1000) String reason) {
}
