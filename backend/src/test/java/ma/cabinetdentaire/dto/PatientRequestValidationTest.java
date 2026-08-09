package ma.cabinetdentaire.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class PatientRequestValidationTest {

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

    @ParameterizedTest(name = "{0} est obligatoire")
    @MethodSource("mandatoryFields")
    void rejectsMissingMandatoryPatientField(String field) {
        Set<ConstraintViolation<PatientRequest>> violations = validator.validate(invalidRequest(field));

        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains(field);
    }

    @Test
    void acceptsMissingOptionalContactAndMedicalFields() {
        assertThat(validator.validate(validRequest())).isEmpty();
    }

    private static Stream<String> mandatoryFields() {
        return Stream.of(
                "firstName",
                "lastName",
                "cin",
                "primaryPhone",
                "city",
                "birthDate",
                "sex"
        );
    }

    private static PatientRequest invalidRequest(String field) {
        return new PatientRequest(
                field.equals("firstName") ? " " : "Sara",
                field.equals("lastName") ? " " : "Amrani",
                field.equals("cin") ? " " : "AB123456",
                field.equals("primaryPhone") ? " " : "0612345678",
                null,
                null,
                field.equals("city") ? " " : "Tinghir",
                field.equals("birthDate") ? null : LocalDate.of(1990, 1, 1),
                field.equals("sex") ? " " : "FEMME",
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private static PatientRequest validRequest() {
        return new PatientRequest(
                "Sara",
                "Amrani",
                "AB123456",
                "0612345678",
                null,
                null,
                "Tinghir",
                LocalDate.of(1990, 1, 1),
                "FEMME",
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
