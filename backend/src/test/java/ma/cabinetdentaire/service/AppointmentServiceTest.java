package ma.cabinetdentaire.service;

import ma.cabinetdentaire.dto.AppointmentRequest;
import ma.cabinetdentaire.entity.Appointment;
import ma.cabinetdentaire.entity.AppointmentStatus;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.repository.AppointmentCalendarLock;
import ma.cabinetdentaire.repository.AppointmentRepository;
import ma.cabinetdentaire.repository.ConsultationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AppointmentServiceTest {

    private static final ZoneId CABINET_ZONE = ZoneId.of("Africa/Casablanca");
    private final AppointmentRepository appointments = mock(AppointmentRepository.class);
    private final ConsultationRepository consultations = mock(ConsultationRepository.class);
    private final AppointmentCalendarLock calendarLock = mock(AppointmentCalendarLock.class);
    private final PatientService patients = mock(PatientService.class);
    private final OfficeHoursValidator officeHours = mock(OfficeHoursValidator.class);
    private final AuditService audit = mock(AuditService.class);
    private AppointmentService service;

    @BeforeEach
    void setUp() {
        service = new AppointmentService(
                appointments, consultations, calendarLock, patients, officeHours, audit);
        when(officeHours.cabinetZone()).thenReturn(CABINET_ZONE);
    }

    @Test
    void availableTimesHideOnlyTheReservedStartTimeAndAllowAdjacentSlots() {
        LocalDate date = LocalDate.of(2099, 7, 28);
        Instant dayStart = date.atStartOfDay(CABINET_ZONE).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(CABINET_ZONE).toInstant();
        Appointment conflict = appointmentAt(date, "09:30", "10:00");
        when(officeHours.rangesFor(date)).thenReturn(List.of(
                new OfficeHoursValidator.TimeRange(LocalTime.of(8, 0), LocalTime.of(12, 0))));
        when(appointments.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd))
                .thenReturn(List.of(conflict));

        List<String> result = service.availableTimes(date, null);

        assertThat(result).containsExactly(
                "08:00", "08:15", "08:30", "08:45",
                "09:00", "09:15", "09:45",
                "10:00", "10:15", "10:30", "10:45",
                "11:00", "11:15", "11:30", "11:45", "12:00");
    }

    @Test
    void availableTimesNeverCrossLunchBreakOrClosingTime() {
        LocalDate date = LocalDate.of(2099, 7, 28);
        when(officeHours.rangesFor(date)).thenReturn(List.of(
                new OfficeHoursValidator.TimeRange(LocalTime.of(9, 0), LocalTime.of(13, 0)),
                new OfficeHoursValidator.TimeRange(LocalTime.of(15, 0), LocalTime.of(18, 0))));
        when(appointments.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(
                date.atStartOfDay(CABINET_ZONE).toInstant(),
                date.plusDays(1).atStartOfDay(CABINET_ZONE).toInstant()
        )).thenReturn(List.of());

        List<String> result = service.availableTimes(date, null);

        assertThat(result)
                .contains("09:00", "12:00", "15:00", "17:00", "18:00")
                .doesNotContain("13:00", "14:45");
    }

    @Test
    void editingExcludesTheCurrentAppointmentFromAvailability() {
        LocalDate date = LocalDate.of(2099, 7, 28);
        UUID excludedId = UUID.randomUUID();
        Instant dayStart = date.atStartOfDay(CABINET_ZONE).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(CABINET_ZONE).toInstant();
        when(officeHours.rangesFor(date)).thenReturn(List.of(
                new OfficeHoursValidator.TimeRange(LocalTime.of(9, 0), LocalTime.of(10, 0))));
        when(appointments.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd))
                .thenReturn(List.of());

        assertThat(service.availableTimes(date, excludedId)).containsExactly("09:00", "09:15", "09:30", "09:45", "10:00");
        verify(appointments).findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd);
        verify(appointments, never()).findConflicts(dayStart, dayEnd);
    }

    @Test
    void availabilityDoesNotOfferPastTimesForToday() {
        LocalDate today = LocalDate.now(CABINET_ZONE);
        Instant dayStart = today.atStartOfDay(CABINET_ZONE).toInstant();
        Instant dayEnd = today.plusDays(1).atStartOfDay(CABINET_ZONE).toInstant();
        when(officeHours.rangesFor(today)).thenReturn(List.of(
                new OfficeHoursValidator.TimeRange(LocalTime.MIN, LocalTime.of(23, 59))));
        when(appointments.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd))
                .thenReturn(List.of());

        List<String> result = service.availableTimes(today, null);

        assertThat(result).doesNotContain("00:00");
    }

    @Test
    void creationRejectsAReservedStartTime() {
        AppointmentRequest request = request(
                "2099-07-28T08:00:00Z",
                "2099-07-28T09:00:00Z");
        when(officeHours.rangesFor(LocalDate.of(2099, 7, 28))).thenReturn(List.of(
                new OfficeHoursValidator.TimeRange(LocalTime.of(8, 0), LocalTime.of(12, 0))));
        Appointment conflict = appointmentAt(LocalDate.of(2099, 7, 28), "09:00", "09:00");
        when(appointments.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(
                LocalDate.of(2099, 7, 28).atStartOfDay(CABINET_ZONE).toInstant(),
                LocalDate.of(2099, 7, 29).atStartOfDay(CABINET_ZONE).toInstant()
        )).thenReturn(List.of(conflict));

        assertThatThrownBy(() -> service.create(request, null, null))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("APPOINTMENT_CONFLICT"));
        verify(patients, never()).requireEntity(request.patientId());
        verify(appointments, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void creationAcquiresTheTransactionLockBeforeCheckingForConflicts() {
        AppointmentRequest request = request(
                "2099-07-28T08:00:00Z",
                "2099-07-28T09:00:00Z");
        when(officeHours.rangesFor(LocalDate.of(2099, 7, 28))).thenReturn(List.of(
                new OfficeHoursValidator.TimeRange(LocalTime.of(8, 0), LocalTime.of(12, 0))));
        Instant dayStart = LocalDate.of(2099, 7, 28).atStartOfDay(CABINET_ZONE).toInstant();
        Instant dayEnd = LocalDate.of(2099, 7, 29).atStartOfDay(CABINET_ZONE).toInstant();
        Appointment conflict = appointmentAt(LocalDate.of(2099, 7, 28), "09:00", "09:00");
        when(appointments.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd))
                .thenReturn(List.of(conflict));

        assertThatThrownBy(() -> service.create(request, null, null))
                .isInstanceOf(BusinessException.class);

        var ordered = inOrder(calendarLock, appointments);
        ordered.verify(calendarLock).acquire();
        ordered.verify(appointments).findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd);
    }

    @Test
    void updateRejectsATerminalAppointmentBeforeChangingIt() {
        UUID id = UUID.randomUUID();
        AppointmentRequest request = request(
                "2099-07-28T08:00:00Z",
                "2099-07-28T09:30:00Z");
        Appointment appointment = mock(Appointment.class);
        when(appointment.getStatus()).thenReturn(AppointmentStatus.TERMINE);
        when(appointments.findById(id)).thenReturn(java.util.Optional.of(appointment));

        assertThatThrownBy(() -> service.update(id, request, null, null))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getCode())
                                .isEqualTo("APPOINTMENT_TERMINAL_STATE"));
        verify(appointment, never()).reschedule(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void arrivedAndCancelRejectATerminalAppointment() {
        UUID id = UUID.randomUUID();
        Appointment appointment = mock(Appointment.class);
        when(appointment.getStatus()).thenReturn(AppointmentStatus.ANNULE);
        when(appointments.findById(id)).thenReturn(java.util.Optional.of(appointment));

        assertThatThrownBy(() -> service.arrived(id, null, null))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getCode())
                                .isEqualTo("APPOINTMENT_TERMINAL_STATE"));
        assertThatThrownBy(() -> service.cancel(id, "Annulation", null, null))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getCode())
                                .isEqualTo("APPOINTMENT_TERMINAL_STATE"));
        verify(appointment, never()).markArrived();
        verify(appointment, never()).cancel(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void creationRejectsAStartTimeOutsideTheFifteenMinuteGrid() {
        AppointmentRequest request = request(
                "2099-07-28T08:07:00Z",
                "2099-07-28T09:07:00Z");

        assertThatThrownBy(() -> service.create(request, null, null))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getCode())
                                .isEqualTo("INVALID_APPOINTMENT_START_TIME"));
        verify(officeHours, never()).validate(request.startsAt(), request.endsAt());
        verify(appointments, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private Appointment appointmentAt(LocalDate date, String start, String end) {
        Appointment appointment = mock(Appointment.class);
        when(appointment.getStartsAt()).thenReturn(
                date.atTime(LocalTime.parse(start)).atZone(CABINET_ZONE).toInstant());
        when(appointment.getEndsAt()).thenReturn(
                date.atTime(LocalTime.parse(end)).atZone(CABINET_ZONE).toInstant());
        return appointment;
    }

    private AppointmentRequest request(String start, String end) {
        return new AppointmentRequest(
                UUID.randomUUID(),
                Instant.parse(start),
                Instant.parse(end),
                null,
                "Consultation",
                null
        );
    }
}
