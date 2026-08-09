package ma.cabinetdentaire.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record AppointmentRequest(
        @NotNull UUID patientId,
        @NotNull @Future Instant startsAt,
        @NotNull @Future Instant endsAt,
        @Size(max = 255) String reason,
        @NotBlank @Size(max = 120) String treatmentType,
        @Size(max = 4000) String observations
) {
}
