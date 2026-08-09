package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.PatientResponse;
import ma.cabinetdentaire.entity.Patient;
public final class PatientMapper {
    private PatientMapper() {}
    public static PatientResponse toResponse(Patient entity) { return PatientResponse.from(entity); }
}
