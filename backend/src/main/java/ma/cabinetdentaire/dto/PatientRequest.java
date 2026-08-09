package ma.cabinetdentaire.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import ma.cabinetdentaire.entity.CoverageType;

import java.time.LocalDate;

public record PatientRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Size(max = 30) String cin,
        @NotBlank @Size(max = 30) String primaryPhone,
        @Size(max = 30) String secondaryPhone,
        @Size(max = 255) String address,
        @NotBlank @Size(max = 100) String city,
        @NotNull @Past LocalDate birthDate,
        @NotBlank @Size(max = 20) String sex,
        @Email @Size(max = 160) String email,
        CoverageType coverageType,
        @Size(max = 80) String membershipNumber,
        @Size(max = 4000) String allergies,
        @Size(max = 8000) String medicalHistory,
        @Size(max = 8000) String observations
) {
}
