package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.LaboratoryResponses.JobResponse;
import ma.cabinetdentaire.dto.LaboratoryResponses.LaboratoryResponse;
import ma.cabinetdentaire.entity.Laboratory;
import ma.cabinetdentaire.entity.LaboratoryJob;
public final class LaboratoryMapper {
    private LaboratoryMapper() {}
    public static LaboratoryResponse toResponse(Laboratory entity) { return LaboratoryResponse.from(entity); }
    public static JobResponse toResponse(LaboratoryJob entity) { return JobResponse.from(entity); }
}
