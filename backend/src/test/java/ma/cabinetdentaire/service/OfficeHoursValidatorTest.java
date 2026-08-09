package ma.cabinetdentaire.service;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.entity.Setting;
import ma.cabinetdentaire.repository.SettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OfficeHoursValidatorTest {
    private final SettingRepository settings = mock(SettingRepository.class);
    private final OfficeHoursValidator validator = new OfficeHoursValidator(settings);

    @BeforeEach
    void useDefaultSchedule() {
        when(settings.findById(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void acceptsWeekdayMorningSlot() {
        assertDoesNotThrow(() -> validator.validate(
                Instant.parse("2026-07-28T09:00:00Z"),
                Instant.parse("2026-07-28T09:30:00Z")));
    }

    @Test
    void rejectsSunday() {
        assertThrows(BusinessException.class, () -> validator.validate(
                Instant.parse("2026-08-02T09:00:00Z"),
                Instant.parse("2026-08-02T09:30:00Z")));
    }

    @Test
    void rejectsLunchBreak() {
        assertThrows(BusinessException.class, () -> validator.validate(
                Instant.parse("2026-07-28T13:00:00Z"),
                Instant.parse("2026-07-28T13:30:00Z")));
    }

    @Test
    void rejectsSlotAcrossTwoDays() {
        assertThrows(BusinessException.class, () -> validator.validate(
                Instant.parse("2026-07-28T16:30:00Z"),
                Instant.parse("2026-07-29T09:00:00Z")));
    }

    @Test
    void usesDoctorScheduleFromSettings() {
        when(settings.findById("appointment.schedule.tuesday")).thenReturn(Optional.of(
                new Setting("appointment.schedule.tuesday", "10:00-12:00", "STRING", false, null)
        ));

        assertDoesNotThrow(() -> validator.validate(
                Instant.parse("2026-07-28T09:00:00Z"),
                Instant.parse("2026-07-28T09:30:00Z")));
        assertThrows(BusinessException.class, () -> validator.validate(
                Instant.parse("2026-07-28T08:00:00Z"),
                Instant.parse("2026-07-28T08:30:00Z")));
    }

    @Test
    void acceptsAdjacentQuarterHourRanges() {
        assertDoesNotThrow(() ->
                validator.validateConfiguredSchedule("09:00-13:00,13:00-17:45"));
    }

    @Test
    void rejectsScheduleOutsideTheQuarterHourGrid() {
        BusinessException exception = assertThrows(BusinessException.class, () ->
                validator.validateConfiguredSchedule("09:10-13:00"));

        assertThat(exception.getCode()).isEqualTo("INVALID_DOCTOR_SCHEDULE");
    }

    @Test
    void rejectsOverlappingScheduleRangesEvenWhenTheyAreNotOrdered() {
        BusinessException exception = assertThrows(BusinessException.class, () ->
                validator.validateConfiguredSchedule("12:45-18:00,09:00-13:00"));

        assertThat(exception.getCode()).isEqualTo("INVALID_DOCTOR_SCHEDULE");
    }
}
