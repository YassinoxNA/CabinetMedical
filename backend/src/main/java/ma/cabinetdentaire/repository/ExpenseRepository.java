package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    List<Expense> findAllByExpenseDateBetweenOrderByExpenseDateDesc(Instant from, Instant to);
}
