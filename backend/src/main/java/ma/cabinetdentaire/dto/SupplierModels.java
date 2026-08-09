package ma.cabinetdentaire.dto;
import jakarta.validation.constraints.*;import ma.cabinetdentaire.entity.*;import java.math.BigDecimal;import java.time.*;import java.util.UUID;
public final class SupplierModels {private SupplierModels(){}
 public record InvoiceRequest(@NotNull UUID laboratoryId,@NotBlank @Size(max=80) String invoiceNumber,@NotNull LocalDate invoiceDate,
    LocalDate dueDate,@NotNull @DecimalMin("0.00") BigDecimal totalAmount,@Size(max=1000) String attachmentPath,@Size(max=4000) String notes){}
 public record PaymentRequest(@NotNull UUID invoiceId,@NotNull @DecimalMin("0.01") BigDecimal amount,@NotNull Instant paymentDate,
    @NotBlank @Size(max=30) String paymentMethod,@Size(max=100) String reference,@Size(max=4000) String notes){}
 public record InvoiceResponse(UUID id,UUID laboratoryId,String laboratory,String invoiceNumber,LocalDate invoiceDate,LocalDate dueDate,
    BigDecimal totalAmount,BigDecimal paidAmount,BigDecimal remainingAmount,String status,String attachmentPath,String notes,String verificationStatus){
    public static InvoiceResponse from(SupplierInvoice i){return new InvoiceResponse(i.getId(),i.getLaboratory().getId(),i.getLaboratory().getName(),
        i.getInvoiceNumber(),i.getInvoiceDate(),i.getDueDate(),i.getTotalAmount(),i.getPaidAmount(),i.getRemainingAmount(),i.getStatus().name(),
        i.getAttachmentPath(),i.getNotes(),i.getVerificationStatus().name());}}
 public record PaymentResponse(UUID id,UUID laboratoryId,UUID invoiceId,BigDecimal amount,Instant paymentDate,String paymentMethod,String reference,String notes,String verificationStatus){
    public static PaymentResponse from(SupplierPayment p){return new PaymentResponse(p.getId(),p.getLaboratory().getId(),p.getInvoice().getId(),p.getAmount(),
        p.getPaymentDate(),p.getPaymentMethod(),p.getReference(),p.getNotes(),p.getVerificationStatus().name());}}
}
