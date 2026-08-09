package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.ExpenseResponse;
import ma.cabinetdentaire.entity.Expense;
public final class ExpenseMapper {
    private ExpenseMapper() {}
    public static ExpenseResponse toResponse(Expense entity) { return ExpenseResponse.from(entity); }
}
