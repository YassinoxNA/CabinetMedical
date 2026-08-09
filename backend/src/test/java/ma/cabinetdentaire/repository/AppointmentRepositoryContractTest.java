package ma.cabinetdentaire.repository;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AppointmentRepositoryContractTest {

    @Test
    void conflictQueryDetectsPartialOverlapsAndIgnoresInactiveAppointments() throws Exception {
        Method method = AppointmentRepository.class.getMethod(
                "findConflicts", Instant.class, Instant.class);
        String query = method.getAnnotation(Query.class).value();

        assertThat(query)
                .contains("a.startsAt < :end")
                .contains("a.endsAt > :start")
                .contains("AppointmentStatus.ANNULE")
                .contains("AppointmentStatus.ABSENT")
                .contains("AppointmentStatus.REPORTE");
    }
}
