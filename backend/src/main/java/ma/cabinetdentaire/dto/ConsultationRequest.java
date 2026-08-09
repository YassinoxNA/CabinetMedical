package ma.cabinetdentaire.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.cabinetdentaire.entity.Consultation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ConsultationRequest(
        UUID treatmentPlanId,
        @NotNull(message = "La date et l’heure de la consultation sont obligatoires.")
        Instant consultationAt,
        @Size(max = 255, message = "Le motif ne doit pas dépasser 255 caractères.")
        String reason,
        @Size(max = 8000, message = "Le diagnostic ne doit pas dépasser 8 000 caractères.")
        String diagnosis,
        @Size(max = 120, message = "Le type de maladie ou d’acte ne doit pas dépasser 120 caractères.")
        String diseaseType,
        @Size(max = 30, message = "La dent concernée ne doit pas dépasser 30 caractères.")
        String tooth,
        @Size(max = 8000, message = "Le traitement effectué ne doit pas dépasser 8 000 caractères.")
        String treatmentPerformed,
        @Size(max = 8000, message = "Les observations ne doivent pas dépasser 8 000 caractères.")
        String observations,
        @Size(max = 8000, message = "L’ordonnance ne doit pas dépasser 8 000 caractères.")
        String prescription,
        @NotNull(message = "Le prix est obligatoire.")
        @DecimalMin(value = "0.00", message = "Le prix doit être supérieur ou égal à 0.")
        @Digits(integer = 10, fraction = 2,
                message = "Le prix ne doit pas dépasser 10 chiffres entiers et 2 décimales.")
        BigDecimal price,
        @NotNull(message = "Le statut du traitement est obligatoire.")
        Consultation.Status treatmentStatus
) {
}
