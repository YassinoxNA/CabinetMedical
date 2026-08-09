package ma.cabinetdentaire.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AppointmentRequestValidationTest {

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
    void acceptsMissingReasonAndObservations() {
        assertThat(validator.validate(validRequest(null))).isEmpty();
    }

    @Test
    void rejectsMissingTreatmentType() {
        Set<ConstraintViolation<AppointmentRequest>> violations = validator.validate(validRequest(" "));

        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("treatmentType");
    }

    @Test
    void rejectsMissingPatientDateOrEndTime() {
        AppointmentRequest request = new AppointmentRequest(
                null,
                null,
                null,
                null,
                "Consultation",
                null
        );

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("patientId", "startsAt", "endsAt");
    }

    private static AppointmentRequest validRequest(String treatmentType) {
        return new AppointmentRequest(
                UUID.randomUUID(),
                Instant.parse("2099-07-28T08:00:00Z"),
                Instant.parse("2099-07-28T09:30:00Z"),
                null,
                treatmentType == null ? "Consultation" : treatmentType,
                null
        );
    }
}
