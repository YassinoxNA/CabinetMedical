package ma.cabinetdentaire.service;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.repository.SettingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class OfficeHoursValidator {

    private static final ZoneId CABINET_ZONE = ZoneId.of("Africa/Casablanca");
    private static final Map<DayOfWeek, String> DEFAULT_SCHEDULE = Map.of(
            DayOfWeek.MONDAY, "09:00-13:00,15:00-18:00",
            DayOfWeek.TUESDAY, "09:00-13:00,15:00-18:00",
            DayOfWeek.WEDNESDAY, "09:00-13:00,15:00-18:00",
            DayOfWeek.THURSDAY, "09:00-13:00,15:00-18:00",
            DayOfWeek.FRIDAY, "09:00-13:00,15:00-18:00",
            DayOfWeek.SATURDAY, "09:00-13:00",
            DayOfWeek.SUNDAY, ""
    );

    private final SettingRepository settingRepository;

    public OfficeHoursValidator(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public void validate(Instant startInstant, Instant endInstant) {
        ZonedDateTime start = startInstant.atZone(CABINET_ZONE);
        ZonedDateTime end = endInstant.atZone(CABINET_ZONE);
        if (!start.toLocalDate().equals(end.toLocalDate()) || !end.isAfter(start)) {
            invalid("Le rendez-vous doit commencer et finir le même jour.");
        }

        LocalTime startTime = start.toLocalTime();
        LocalTime endTime = end.toLocalTime();
        List<TimeRange> ranges = scheduleFor(start.getDayOfWeek());
        if (ranges.isEmpty()) {
            invalid("Le docteur n'est pas disponible ce jour.");
        }

        boolean available = ranges.stream()
                .anyMatch(range -> !startTime.isBefore(range.start()) && !endTime.isAfter(range.end()));
        if (!available) {
            invalid("Ce créneau est en dehors des heures de présence du docteur.");
        }
    }

    public ZoneId cabinetZone() {
        return CABINET_ZONE;
    }

    public List<TimeRange> rangesFor(LocalDate date) {
        return scheduleFor(date.getDayOfWeek());
    }

    public void validateConfiguredSchedule(String configured) {
        try {
            parseSchedule(configured);
        } catch (RuntimeException exception) {
            throw invalidSchedule();
        }
    }

    private List<TimeRange> scheduleFor(DayOfWeek day) {
        String key = "appointment.schedule." + day.name().toLowerCase(Locale.ROOT);
        String configured = settingRepository.findById(key)
                .map(setting -> setting.getValue() == null ? "" : setting.getValue().trim())
                .orElse(DEFAULT_SCHEDULE.get(day));
        try {
            return parseSchedule(configured);
        } catch (RuntimeException exception) {
            throw invalidSchedule();
        }
    }

    private List<TimeRange> parseSchedule(String configured) {
        if (configured == null || configured.isBlank()) {
            return List.of();
        }
        List<TimeRange> ranges = Arrays.stream(configured.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(this::parseRange)
                .sorted(Comparator.comparing(TimeRange::start))
                .toList();
        for (int index = 1; index < ranges.size(); index++) {
            if (ranges.get(index).start().isBefore(ranges.get(index - 1).end())) {
                throw new IllegalArgumentException("Overlapping schedule ranges");
            }
        }
        return ranges;
    }

    private TimeRange parseRange(String value) {
        String[] parts = value.split("-", 2);
        if (parts.length != 2) {
            throw new IllegalArgumentException();
        }
        LocalTime start = LocalTime.parse(parts[0].trim());
        LocalTime end = LocalTime.parse(parts[1].trim());
        if (!isOnQuarterHour(start) || !isOnQuarterHour(end) || !end.isAfter(start)) {
            throw new IllegalArgumentException();
        }
        return new TimeRange(start, end);
    }

    private boolean isOnQuarterHour(LocalTime time) {
        return time.getMinute() % 15 == 0 && time.getSecond() == 0 && time.getNano() == 0;
    }

    private BusinessException invalidSchedule() {
        return new BusinessException(
                "INVALID_DOCTOR_SCHEDULE",
                "Les horaires doivent suivre un pas de 15 minutes, sans plages qui se chevauchent.",
                HttpStatus.BAD_REQUEST
        );
    }

    private void invalid(String message) {
        throw new BusinessException("APPOINTMENT_OUTSIDE_OFFICE_HOURS", message, HttpStatus.BAD_REQUEST);
    }

    public record TimeRange(LocalTime start, LocalTime end) {
    }
}
