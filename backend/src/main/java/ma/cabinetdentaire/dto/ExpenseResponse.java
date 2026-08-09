package ma.cabinetdentaire.dto;
import ma.cabinetdentaire.entity.Expense;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
public record ExpenseResponse(UUID id, String categoryCode, String categoryLabel, String label,
        BigDecimal amount, Instant expenseDate, String supplier, String paymentMethod,
        String reference, String attachmentPath, String notes) {
    public static ExpenseResponse from(Expense expense) {
        return new ExpenseResponse(expense.getId(), expense.getCategory().getCode(),
                expense.getCategory().getLabel(), expense.getLabel(), expense.getAmount(),
                expense.getExpenseDate(), expense.getSupplier(), expense.getPaymentMethod(),
                expense.getReference(), expense.getAttachmentPath(), expense.getNotes());
    }
}
