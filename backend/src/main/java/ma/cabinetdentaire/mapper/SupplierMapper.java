package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.SupplierModels.InvoiceResponse;
import ma.cabinetdentaire.dto.SupplierModels.PaymentResponse;
import ma.cabinetdentaire.entity.SupplierInvoice;
import ma.cabinetdentaire.entity.SupplierPayment;
public final class SupplierMapper {
    private SupplierMapper() {}
    public static InvoiceResponse toResponse(SupplierInvoice entity) { return InvoiceResponse.from(entity); }
    public static PaymentResponse toResponse(SupplierPayment entity) { return PaymentResponse.from(entity); }
}
