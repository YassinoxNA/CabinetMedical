package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.InvoiceResponse;
import ma.cabinetdentaire.entity.PatientInvoice;
public final class InvoiceMapper {
    private InvoiceMapper() {}
    public static InvoiceResponse toResponse(PatientInvoice entity) { return InvoiceResponse.from(entity); }
}
