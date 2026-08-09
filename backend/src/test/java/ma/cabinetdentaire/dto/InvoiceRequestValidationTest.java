package ma.cabinetdentaire.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import ma.cabinetdentaire.entity.PatientInvoice;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InvoiceRequestValidationTest {

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
    void acceptsCompleteDocumentWithoutOptionalToothOrNotes() {
        assertThat(validator.validate(validRequest(new BigDecimal("500.00")))).isEmpty();
    }

    @Test
    void rejectsZeroUnitPrice() {
        assertThat(validator.validate(validRequest(BigDecimal.ZERO)))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("items[0].unitPrice");
    }

    private static InvoiceRequest validRequest(BigDecimal unitPrice) {
        return new InvoiceRequest(
                UUID.randomUUID(),
                PatientInvoice.Type.FACTURE,
                LocalDate.of(2026, 7, 28),
                null,
                List.of(new InvoiceRequest.Item(
                        "Consultation dentaire",
                        null,
                        BigDecimal.ONE,
                        unitPrice
                ))
        );
    }
}
