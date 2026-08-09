package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.ConsultationResponse;
import ma.cabinetdentaire.entity.Consultation;
public final class ConsultationMapper {
    private ConsultationMapper() {}
    public static ConsultationResponse toResponse(Consultation entity) { return ConsultationResponse.from(entity); }
}
