package ma.cabinetdentaire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.cabinetdentaire.entity.RoleCode;

public record CreateUserRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank
        @Size(min = 3, max = 80)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Format du nom d’utilisateur invalide.")
        String username,
        @NotNull RoleCode role
) {
}
