package ma.cabinetdentaire.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public final class LaboratoryRequests {
    private LaboratoryRequests() {}
    public record CreateLaboratory(@NotBlank @Size(max=180) String name,
        @NotBlank @Size(max=180) String managerName,
        @NotBlank @Size(max=30) String phone,
        @Email @Size(max=160) String email,
        @Size(max=255) String address,
        @NotBlank @Size(max=100) String city,
        @Size(max=80) String taxIdentifier, @Size(max=4000) String observations) {}
    public record CreateJob(@NotNull UUID laboratoryId, @NotNull UUID patientId,
        @NotBlank @Size(max=100) String jobType, @NotBlank @Size(max=30) String tooth,
        @NotBlank @Size(max=40) String shade, @Size(max=4000) String description,
        @NotNull LocalDate sentDate, @NotNull LocalDate expectedDate,
        @NotNull @DecimalMin("0.01") BigDecimal laboratoryPrice, @Size(max=4000) String notes) {}
}
