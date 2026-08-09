package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.dto.AppointmentRequest;
import ma.cabinetdentaire.dto.AppointmentResponse;
import ma.cabinetdentaire.dto.PatientDossierAccessResponse;
import ma.cabinetdentaire.entity.Appointment;
import ma.cabinetdentaire.entity.AppointmentStatus;
import ma.cabinetdentaire.entity.PatientFileStatus;
import ma.cabinetdentaire.repository.AppointmentCalendarLock;
import ma.cabinetdentaire.repository.AppointmentRepository;
import ma.cabinetdentaire.repository.ConsultationRepository;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AppointmentService {

    private final AppointmentRepository repository;
    private final ConsultationRepository consultationRepository;
    private final AppointmentCalendarLock calendarLock;
    private final PatientService patientService;
    private final OfficeHoursValidator hoursValidator;
    private final AuditService auditService;
    private final ApplicationEventPublisher events;
    private final Clock clock = Clock.systemUTC();
    private static final int SLOT_STEP_MINUTES = 15;
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    public AppointmentService(AppointmentRepository repository, ConsultationRepository consultationRepository,
                              AppointmentCalendarLock calendarLock,
                              PatientService patientService,
                              OfficeHoursValidator hoursValidator,
                              AuditService auditService,
                              ApplicationEventPublisher events) {
        this.repository = repository;
        this.consultationRepository = consultationRepository;
        this.calendarLock = calendarLock;
        this.patientService = patientService;
        this.hoursValidator = hoursValidator;
        this.auditService = auditService;
        this.events = events;
    }

    AppointmentService(AppointmentRepository repository, ConsultationRepository consultationRepository,
                       AppointmentCalendarLock calendarLock, PatientService patientService,
                       OfficeHoursValidator hoursValidator, AuditService auditService) {
        this(repository, consultationRepository, calendarLock, patientService, hoursValidator,
                auditService, event -> { });
    }

    @Transactional(readOnly = true)
    public PatientDossierAccessResponse dossierAccess(UUID patientId) {
        var patient = patientService.requireEntity(patientId);
        boolean hasConsultation = consultationRepository.existsByPatientIdAndDeletedAtIsNull(patientId);
        boolean hasUsableAppointment = repository.existsUsableAppointmentForPatient(patientId);

        if (patient.getFileStatus() == PatientFileStatus.TRAITEMENT_TERMINE && hasConsultation) {
            var lastConsultation = consultationRepository
                    .findFirstByPatientIdAndDeletedAtIsNullOrderByConsultationAtDesc(patientId)
                    .orElseThrow();
            boolean hasNewAppointment = repository.existsNewAppointmentAfter(
                    patientId, lastConsultation.getConsultationAt());
            return hasNewAppointment
                    ? new PatientDossierAccessResponse(true, "ACCESS_ALLOWED")
                    : new PatientDossierAccessResponse(false, "NEW_APPOINTMENT_REQUIRED");
        }

        if (hasConsultation || hasUsableAppointment) {
            return new PatientDossierAccessResponse(true, "ACCESS_ALLOWED");
        }
        return new PatientDossierAccessResponse(false, "APPOINTMENT_REQUIRED");
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> calendar(Instant from, Instant to) {
        return repository.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(from, to)
                .stream().map(AppointmentMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<String> availableTimes(LocalDate date, UUID excludedId) {
        var zone = hoursValidator.cabinetZone();
        Instant dayStart = date.atStartOfDay(zone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant();
        List<Appointment> sameDayAppointments =
                repository.findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd);
        Instant now = clock.instant();
        List<String> available = new ArrayList<>();

        List<OfficeHoursValidator.TimeRange> ranges = hoursValidator.rangesFor(date);
        for (int rangeIndex = 0; rangeIndex < ranges.size(); rangeIndex++) {
            OfficeHoursValidator.TimeRange range = ranges.get(rangeIndex);
            long rangeMinutes = Duration.between(range.start(), range.end()).toMinutes();
            boolean lastRange = rangeIndex == ranges.size() - 1;
            for (long offset = 0; offset <= rangeMinutes; offset += SLOT_STEP_MINUTES) {
                if (offset == rangeMinutes && !lastRange) {
                    continue;
                }
                LocalTime candidate = range.start().plusMinutes(offset);
                Instant candidateStart = date.atTime(candidate).atZone(zone).toInstant();
                if (!candidateStart.isAfter(now)) {
                    continue;
                }
                boolean alreadyReserved = sameDayAppointments.stream().anyMatch(appointment ->
                        blocksAgenda(appointment, excludedId)
                                && appointment.getStartsAt().equals(candidateStart));
                if (!alreadyReserved) {
                    available.add(candidate.format(TIME_FORMAT));
                }
            }
        }
        return available;
    }

    @Transactional
    public AppointmentResponse create(AppointmentRequest request, User actor, ClientRequestInfo client) {
        calendarLock.acquire();
        validateSlot(request.startsAt(), null);
        var patient = patientService.requireEntity(request.patientId());
        Appointment appointment = repository.save(new Appointment(
                patient, request.startsAt(), request.startsAt(), request.reason(),
                request.treatmentType(), request.observations()
        ));
        patient.startNewTreatmentCycle();
        auditService.record(actor, "APPOINTMENT_CREATED", "APPOINTMENT", "APPOINTMENT",
                appointment.getId(), "CrÃ©ation dâ€™un rendez-vous pour " + patient.getPatientNumber() + ".", client);
        publishSms(appointment, actor, ma.cabinetdentaire.entity.SmsMessage.Type.CREATION);
        return AppointmentMapper.toResponse(appointment);
    }

    @Transactional
    public AppointmentResponse update(UUID id, AppointmentRequest request, User actor,
                                      ClientRequestInfo client) {
        calendarLock.acquire();
        Appointment appointment = require(id);
        rejectTerminalState(appointment, "modifiÃ©");
        if (!appointment.getPatient().getId().equals(request.patientId())) {
            throw new BusinessException("APPOINTMENT_PATIENT_IMMUTABLE",
                    "Le patient dâ€™un rendez-vous ne peut pas Ãªtre remplacÃ©.", HttpStatus.BAD_REQUEST);
        }
        validateSlot(request.startsAt(), id);
        appointment.reschedule(request.startsAt(), request.startsAt(), request.reason(),
                request.treatmentType(), request.observations());
        auditService.record(actor, "APPOINTMENT_UPDATED", "APPOINTMENT", "APPOINTMENT",
                id, "Modification du rendez-vous.", client);
        publishSms(appointment, actor, ma.cabinetdentaire.entity.SmsMessage.Type.MODIFICATION);
        return AppointmentMapper.toResponse(appointment);
    }

    @Transactional
    public AppointmentResponse arrived(UUID id, User actor, ClientRequestInfo client) {
        calendarLock.acquire();
        Appointment appointment = require(id);
        rejectTerminalState(appointment, "marquÃ© comme arrivÃ©");
        appointment.markArrived();
        auditService.record(actor, "PATIENT_ARRIVED", "APPOINTMENT", "APPOINTMENT",
                id, "Patient marquÃ© comme arrivÃ©.", client);
        return AppointmentMapper.toResponse(appointment);
    }

    @Transactional
    public AppointmentResponse confirm(UUID id, User actor, ClientRequestInfo client) {
        calendarLock.acquire();
        Appointment appointment = require(id);
        rejectTerminalState(appointment, "confirmÃ©");
        appointment.confirm();
        auditService.record(actor, "APPOINTMENT_CONFIRMED", "APPOINTMENT", "APPOINTMENT",
                id, "Confirmation du rendez-vous.", client);
        return AppointmentMapper.toResponse(appointment);
    }

    @Transactional
    public AppointmentResponse cancel(UUID id, String reason, User actor, ClientRequestInfo client) {
        calendarLock.acquire();
        Appointment appointment = require(id);
        rejectTerminalState(appointment, "annulÃ©");
        LocalDate appointmentDate = appointment.getStartsAt()
                .atZone(hoursValidator.cabinetZone()).toLocalDate();
        LocalDate today = clock.instant().atZone(hoursValidator.cabinetZone()).toLocalDate();
        if (!appointmentDate.isAfter(today)) {
            throw new BusinessException(
                    "APPOINTMENT_CANCELLATION_TOO_LATE",
                    "L'annulation est autorisÃ©e uniquement avant le jour du rendez-vous.",
                    HttpStatus.BAD_REQUEST
            );
        }
        appointment.cancel(clock.instant(), reason);
        repository.flush();
        restoreCompletedStatusWhenNoNewAppointmentRemains(appointment);
        auditService.record(actor, "APPOINTMENT_CANCELLED", "APPOINTMENT", "APPOINTMENT",
                id, "Annulation du rendez-vous : " + reason, client);
        publishSms(appointment, actor, ma.cabinetdentaire.entity.SmsMessage.Type.ANNULATION);
        return AppointmentMapper.toResponse(appointment);
    }

    private void publishSms(Appointment appointment, User actor,
                            ma.cabinetdentaire.entity.SmsMessage.Type type) {
        if (!appointment.isSmsRequested()) {
            return;
        }
        var patient = appointment.getPatient();
        events.publishEvent(new AppointmentSmsEvent(
                appointment.getId(),
                patient.getId(),
                actor == null ? null : actor.getId(),
                patient.getFirstName() + " " + patient.getLastName(),
                patient.getPrimaryPhone(),
                appointment.getStartsAt(),
                type
        ));
    }

    private void restoreCompletedStatusWhenNoNewAppointmentRemains(Appointment appointment) {
        var patient = appointment.getPatient();
        if (patient.getFileStatus() != PatientFileStatus.NOUVEAU_TRAITEMENT_PLANIFIE) {
            return;
        }
        consultationRepository
                .findFirstByPatientIdAndDeletedAtIsNullOrderByConsultationAtDesc(patient.getId())
                .ifPresent(lastConsultation -> {
                    boolean anotherAppointmentRemains = repository.existsNewAppointmentAfter(
                            patient.getId(), lastConsultation.getConsultationAt());
                    if (!anotherAppointmentRemains) {
                        patient.restoreCompletedTreatmentStatus();
                    }
                });
    }

    private void validateSlot(Instant start, UUID excludedId) {
        if (!start.isAfter(clock.instant())) {
            throw new BusinessException("APPOINTMENT_IN_PAST",
                    "La date et l'heure du rendez-vous doivent être postérieures à maintenant.",
                    HttpStatus.BAD_REQUEST);
        }
        var zone = hoursValidator.cabinetZone();
        var localStartDateTime = start.atZone(zone);
        LocalTime localStart = localStartDateTime.toLocalTime();
        if (localStart.getMinute() % SLOT_STEP_MINUTES != 0
                || localStart.getSecond() != 0 || localStart.getNano() != 0) {
            throw new BusinessException("INVALID_APPOINTMENT_START_TIME",
                    "L'heure de début doit respecter un pas de 15 minutes.",
                    HttpStatus.BAD_REQUEST);
        }
        if (!isAllowedAppointmentStart(localStartDateTime.toLocalDate(), localStart)) {
            throw new BusinessException("APPOINTMENT_OUTSIDE_OFFICE_HOURS",
                    "Ce rendez-vous est en dehors des heures de présence du docteur.",
                    HttpStatus.BAD_REQUEST);
        }
        Instant dayStart = localStartDateTime.toLocalDate().atStartOfDay(zone).toInstant();
        Instant dayEnd = localStartDateTime.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();
        boolean alreadyReserved = repository
                .findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(dayStart, dayEnd)
                .stream()
                .anyMatch(appointment -> blocksAgenda(appointment, excludedId)
                        && appointment.getStartsAt().equals(start));
        if (alreadyReserved) {
            throw new BusinessException("APPOINTMENT_CONFLICT",
                    "Cette heure est déjà réservée.", HttpStatus.CONFLICT);
        }
    }

    private boolean isAllowedAppointmentStart(LocalDate date, LocalTime time) {
        List<OfficeHoursValidator.TimeRange> ranges = hoursValidator.rangesFor(date);
        for (int rangeIndex = 0; rangeIndex < ranges.size(); rangeIndex++) {
            OfficeHoursValidator.TimeRange range = ranges.get(rangeIndex);
            boolean lastRange = rangeIndex == ranges.size() - 1;
            boolean insideRange = !time.isBefore(range.start())
                    && (time.isBefore(range.end()) || (lastRange && time.equals(range.end())));
            if (insideRange) {
                return true;
            }
        }
        return false;
    }

    private boolean blocksAgenda(Appointment appointment, UUID excludedId) {
        if (excludedId != null && excludedId.equals(appointment.getId())) {
            return false;
        }
        AppointmentStatus status = appointment.getStatus();
        return status == null
                || (status != AppointmentStatus.ANNULE
                && status != AppointmentStatus.ABSENT
                && status != AppointmentStatus.REPORTE);
    }
    private void rejectTerminalState(Appointment appointment, String action) {
        AppointmentStatus status = appointment.getStatus();
        if (status != null && status.isTerminal()) {
            throw new BusinessException(
                    "APPOINTMENT_TERMINAL_STATE",
                    "Un rendez-vous terminÃ©, annulÃ©, absent ou reportÃ© ne peut plus Ãªtre " + action + ".",
                    HttpStatus.CONFLICT
            );
        }
    }

    private Appointment require(UUID id) {
        return repository.findById(id).orElseThrow(() -> new BusinessException(
                "APPOINTMENT_NOT_FOUND", "Rendez-vous introuvable.", HttpStatus.NOT_FOUND));
    }
}
