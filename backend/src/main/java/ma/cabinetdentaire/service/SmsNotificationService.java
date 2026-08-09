package ma.cabinetdentaire.service;

import ma.cabinetdentaire.entity.SmsMessage;
import ma.cabinetdentaire.repository.AppointmentRepository;
import ma.cabinetdentaire.repository.PatientRepository;
import ma.cabinetdentaire.repository.SettingRepository;
import ma.cabinetdentaire.repository.SmsMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class SmsNotificationService {
    private static final Logger log = LoggerFactory.getLogger(SmsNotificationService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final AppointmentRepository appointments;
    private final PatientRepository patients;
    private final SmsMessageRepository messages;
    private final SettingRepository settings;
    private final GsmModemService modem;

    public SmsNotificationService(AppointmentRepository appointments, PatientRepository patients,
                                  SmsMessageRepository messages, SettingRepository settings,
                                  GsmModemService modem) {
        this.appointments = appointments;
        this.patients = patients;
        this.messages = messages;
        this.settings = settings;
        this.modem = modem;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void send(AppointmentSmsEvent event) {
        boolean enabled = settings.findById("gsm.enabled")
                .map(setting -> Boolean.parseBoolean(setting.getValue()))
                .orElse(false);
        if (!enabled) return;
        try {
            var patient = patients.findById(event.patientId()).orElseThrow();
            var appointment = appointments.findById(event.appointmentId()).orElseThrow();
            String body = render(event);
            String phone = event.phoneNumber() == null ? "" : event.phoneNumber().trim();
            SmsMessage message = messages.save(new SmsMessage(
                    patient, appointment, phone.isBlank() ? "NUMERO_ABSENT" : phone,
                    body, event.type(), event.actorId()));
            if (phone.isBlank()) {
                message.markFailed("Le patient ne possède aucun numéro de téléphone.");
                return;
            }
            GsmModemService.SendResult result = modem.send(phone, body);
            if (result.sent()) message.markSent(result.response());
            else message.markFailed(result.response());
        } catch (Exception exception) {
            log.error("Impossible de traiter le SMS du rendez-vous {}.",
                    event.appointmentId(), exception);
        }
    }

    private String render(AppointmentSmsEvent event) {
        String key = switch (event.type()) {
            case CREATION -> "sms.template.creation";
            case MODIFICATION -> "sms.template.modification";
            case ANNULATION -> "sms.template.cancellation";
        };
        String fallback = switch (event.type()) {
            case CREATION -> "Bonjour {patient}, votre rendez-vous est prevu le {date} a {heure}. DENTAL SABRI.";
            case MODIFICATION -> "Bonjour {patient}, votre rendez-vous est modifie au {date} a {heure}. DENTAL SABRI.";
            case ANNULATION -> "Bonjour {patient}, votre rendez-vous du {date} a {heure} est annule. DENTAL SABRI.";
        };
        ZoneId zone = ZoneId.of(settings.findById("cabinet.timezone")
                .map(setting -> setting.getValue()).orElse("Africa/Casablanca"));
        var local = event.startsAt().atZone(zone);
        return settings.findById(key).map(setting -> setting.getValue()).orElse(fallback)
                .replace("{patient}", event.patientName())
                .replace("{date}", local.toLocalDate().format(DATE))
                .replace("{heure}", local.toLocalTime().format(TIME));
    }
}
