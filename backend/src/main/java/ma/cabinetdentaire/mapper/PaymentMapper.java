package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.PaymentResponse;
import ma.cabinetdentaire.entity.PatientPayment;
public final class PaymentMapper {
    private PaymentMapper() {}
    public static PaymentResponse toResponse(PatientPayment entity) { return PaymentResponse.from(entity); }
}
