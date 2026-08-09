package ma.cabinetdentaire.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record SettingRequest(@NotBlank @Size(max=120) String key,
        @Size(max=10000) String value, @NotBlank @Size(max=30) String valueType) {}
