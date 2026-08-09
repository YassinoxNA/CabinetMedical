package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.dto.ExpenseRequest;
import ma.cabinetdentaire.dto.ExpenseResponse;
import ma.cabinetdentaire.entity.Expense;
import ma.cabinetdentaire.repository.ExpenseCategoryRepository;
import ma.cabinetdentaire.repository.ExpenseRepository;
import ma.cabinetdentaire.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {
    private final ExpenseCategoryRepository categories;
    private final ExpenseRepository expenses;
    private final AuditService audit;

    public ExpenseService(ExpenseCategoryRepository categories, ExpenseRepository expenses,
                          AuditService audit) {
        this.categories = categories;
        this.expenses = expenses;
        this.audit = audit;
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest request, User actor, ClientRequestInfo client) {
        var category = categories.findByCodeAndActiveTrue(request.categoryCode().toUpperCase())
                .orElseThrow(() -> new BusinessException("EXPENSE_CATEGORY_NOT_FOUND",
                        "Catégorie de dépense introuvable.", HttpStatus.NOT_FOUND));
        Expense expense = expenses.save(new Expense(category, request.label(), request.amount(),
                request.expenseDate(), request.supplier(), request.paymentMethod(),
                request.reference(), request.attachmentPath(), request.notes(), actor.getId()));
        audit.record(actor, "EXPENSE_CREATED", "EXPENSE", "EXPENSE", expense.getId(),
                "Dépense de " + request.amount() + " MAD : " + request.label(), client);
        return ExpenseMapper.toResponse(expense);
    }
}
