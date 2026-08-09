package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.AppointmentResponse;
import ma.cabinetdentaire.entity.Appointment;
public final class AppointmentMapper {
    private AppointmentMapper() {}
    public static AppointmentResponse toResponse(Appointment entity) { return AppointmentResponse.from(entity); }
}
