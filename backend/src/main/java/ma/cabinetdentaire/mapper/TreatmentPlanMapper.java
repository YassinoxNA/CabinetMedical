package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.TreatmentPlanResponse;
import ma.cabinetdentaire.entity.TreatmentPlan;
public final class TreatmentPlanMapper {
    private TreatmentPlanMapper() {}
    public static TreatmentPlanResponse toResponse(TreatmentPlan entity) { return TreatmentPlanResponse.from(entity); }
}
