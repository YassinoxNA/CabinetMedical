package ma.cabinetdentaire.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class AppointmentTest {

    @Test
    void usesTreatmentTypeAsDisplayReasonWhenReasonIsOmitted() {
        Appointment appointment = new Appointment(
                mock(Patient.class),
                Instant.parse("2099-07-28T08:00:00Z"),
                Instant.parse("2099-07-28T09:30:00Z"),
                null,
                "Détartrage",
                null
        );

        assertThat(appointment.getReason()).isEqualTo("Détartrage");
        assertThat(appointment.getTreatmentType()).isEqualTo("Détartrage");
    }
    @Test
    void terminalAppointmentCannotBeChangedAgain() {
        Appointment appointment = new Appointment(
                mock(Patient.class),
                Instant.parse("2099-07-28T08:00:00Z"),
                Instant.parse("2099-07-28T09:30:00Z"),
                null,
                "Consultation",
                null
        );
        appointment.cancel(Instant.parse("2099-07-27T08:00:00Z"), "Annulation");

        assertThatThrownBy(appointment::markArrived).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> appointment.cancel(
                Instant.parse("2099-07-27T09:00:00Z"), "Encore"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> appointment.reschedule(
                Instant.parse("2099-07-29T08:00:00Z"),
                Instant.parse("2099-07-29T09:00:00Z"),
                null, "Consultation", null))
                .isInstanceOf(IllegalStateException.class);
    }
}
