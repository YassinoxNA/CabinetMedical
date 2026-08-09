package ma.cabinetdentaire.service;

import ma.cabinetdentaire.entity.SmsMessage;

import java.time.Instant;
import java.util.UUID;

public record AppointmentSmsEvent(
        UUID appointmentId, UUID patientId, UUID actorId, String patientName,
        String phoneNumber, Instant startsAt, SmsMessage.Type type
) {
}
