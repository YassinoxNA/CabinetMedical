package ma.cabinetdentaire.dto;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
public record CashSessionResponse(UUID id, Instant openedAt, Instant closedAt,
        BigDecimal openingBalance, BigDecimal patientIncome, BigDecimal supplierOutflow,
        BigDecimal expenses, BigDecimal theoreticalBalance, BigDecimal actualClosingBalance,
        String status, UUID responsibleUserId, String responsibleUsername) {}
