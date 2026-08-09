package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.VerificationModels.Response;
import ma.cabinetdentaire.entity.VerificationRequest;
public final class VerificationMapper {
    private VerificationMapper() {}
    public static Response toResponse(VerificationRequest entity) { return Response.from(entity); }
}
