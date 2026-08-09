package ma.cabinetdentaire.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import ma.cabinetdentaire.entity.Consultation;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ConsultationRequestValidationTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidatorFactory() {
        validatorFactory.close();
    }

    @Test
    void acceptsCompleteConsultationWithoutTreatmentPlan() {
        assertThat(validator.validate(validRequest())).isEmpty();
    }

    @Test
    void rejectsAllMissingRequiredFields() {
        ConsultationRequest request = new ConsultationRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertThat(propertyPaths(validator.validate(request)))
                .containsExactlyInAnyOrder(
                        "consultationAt",
                        "price",
                        "treatmentStatus"
                );
    }

    @Test
    void acceptsBlankOptionalMedicalDescriptions() {
        ConsultationRequest request = new ConsultationRequest(
                null,
                Instant.parse("2026-07-28T10:30:00Z"),
                " ",
                "\t",
                "",
                "  ",
                "\n",
                " ",
                "\t",
                BigDecimal.ZERO,
                Consultation.Status.EN_COURS
        );

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void rejectsNegativeOrDatabaseOverflowingPrice() {
        ConsultationRequest negativePrice = withPrice(new BigDecimal("-0.01"));
        ConsultationRequest overflowingPrice = withPrice(new BigDecimal("12345678901.00"));
        ConsultationRequest excessiveScale = withPrice(new BigDecimal("100.123"));

        assertThat(propertyPaths(validator.validate(negativePrice))).contains("price");
        assertThat(propertyPaths(validator.validate(overflowingPrice))).contains("price");
        assertThat(propertyPaths(validator.validate(excessiveScale))).contains("price");
    }

    @Test
    void rejectsValuesLongerThanDatabaseOrApplicationLimits() {
        ConsultationRequest request = new ConsultationRequest(
                null,
                Instant.parse("2026-07-28T10:30:00Z"),
                "M".repeat(256),
                "D".repeat(8001),
                "A".repeat(121),
                "T".repeat(31),
                "S".repeat(8001),
                "O".repeat(8001),
                "P".repeat(8001),
                BigDecimal.ZERO,
                Consultation.Status.EN_COURS
        );

        assertThat(propertyPaths(validator.validate(request)))
                .containsExactlyInAnyOrder(
                        "reason",
                        "diagnosis",
                        "diseaseType",
                        "tooth",
                        "treatmentPerformed",
                        "observations",
                        "prescription"
                );
    }

    private static ConsultationRequest validRequest() {
        return new ConsultationRequest(
                null,
                Instant.parse("2026-07-28T10:30:00Z"),
                "Douleur dentaire",
                "Carie profonde",
                "SOINS_CARIE",
                "16",
                "Nettoyage et obturation",
                "Contrôle recommandé dans six mois",
                "Antalgique pendant trois jours",
                new BigDecimal("500.00"),
                Consultation.Status.TERMINE
        );
    }

    private static ConsultationRequest withPrice(BigDecimal price) {
        ConsultationRequest valid = validRequest();
        return new ConsultationRequest(
                valid.treatmentPlanId(),
                valid.consultationAt(),
                valid.reason(),
                valid.diagnosis(),
                valid.diseaseType(),
                valid.tooth(),
                valid.treatmentPerformed(),
                valid.observations(),
                valid.prescription(),
                price,
                valid.treatmentStatus()
        );
    }

    private static Set<String> propertyPaths(Set<? extends ConstraintViolation<?>> violations) {
        return violations.stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());
    }
}
