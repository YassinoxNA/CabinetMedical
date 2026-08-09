package ma.cabinetdentaire.service;

import ma.cabinetdentaire.dto.DashboardStatsResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DashboardService {
    private static final ZoneId CABINET_ZONE = ZoneId.of("Africa/Casablanca");
    private static final List<String> FRENCH_DAY_LABELS =
            List.of("Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim");

    private final JdbcTemplate jdbc;

    public DashboardService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse statistics() {
        LocalDate today = LocalDate.now(CABINET_ZONE);
        Instant todayStart = today.atStartOfDay(CABINET_ZONE).toInstant();
        Instant tomorrowStart = today.plusDays(1).atStartOfDay(CABINET_ZONE).toInstant();
        LocalDate monthStartDate = today.withDayOfMonth(1);
        Instant monthStart = monthStartDate.atStartOfDay(CABINET_ZONE).toInstant();
        Instant nextMonthStart = monthStartDate.plusMonths(1).atStartOfDay(CABINET_ZONE).toInstant();

        return new DashboardStatsResponse(
                Instant.now(),
                count("select count(*) from patients where deleted_at is null"),
                count("select count(*) from patients where deleted_at is null and created_at >= ? and created_at < ?",
                        monthStart, nextMonthStart),
                count("select count(*) from appointments where starts_at >= ? and starts_at < ?",
                        todayStart, tomorrowStart),
                count("""
                        select count(*) from appointments
                        where starts_at >= ? and starts_at < ?
                          and status in ('PLANIFIE','CONFIRME','PATIENT_ARRIVE','EN_CONSULTATION')
                        """, todayStart, tomorrowStart),
                count("""
                        select count(*) from appointments
                        where starts_at >= ? and starts_at < ? and status = 'TERMINE'
                        """, todayStart, tomorrowStart),
                count("""
                        select count(*) from appointments
                        where starts_at >= ? and starts_at < ? and status in ('ANNULE','ABSENT')
                        """, todayStart, tomorrowStart),
                count("""
                        select count(*) from consultations
                        where deleted_at is null and consultation_at >= ? and consultation_at < ?
                        """, monthStart, nextMonthStart),
                amount("""
                        select coalesce(sum(total_amount), 0) from patient_invoices
                        where invoice_date >= ? and invoice_date < ? and status <> 'ANNULEE'
                        """, monthStartDate, monthStartDate.plusMonths(1)),
                amount("""
                        select coalesce(sum(amount), 0) from patient_payments
                        where cancelled_at is null and payment_date >= ? and payment_date < ?
                        """, monthStart, nextMonthStart),
                amount("""
                        select coalesce(sum(remaining_amount), 0) from patient_invoices
                        where status <> 'ANNULEE'
                        """),
                count("""
                        select count(*) from laboratory_jobs
                        where status not in ('TERMINE','ANNULE','POSE_AU_PATIENT')
                        """),
                dailyActivity(today),
                newPatientsByWeek(monthStartDate, today),
                consultationsByCategory(monthStart, nextMonthStart),
                collectionsLast6Months(monthStartDate)
        );
    }

    private List<DashboardStatsResponse.WeeklyPatients> newPatientsByWeek(
            LocalDate monthStart, LocalDate today) {
        List<DashboardStatsResponse.WeeklyPatients> result = new ArrayList<>();
        LocalDate cursor = monthStart;
        int week = 1;
        while (!cursor.isAfter(today)) {
            LocalDate end = cursor.plusDays(7);
            result.add(new DashboardStatsResponse.WeeklyPatients(
                    "Sem. " + week,
                    count("""
                            select count(*) from patients
                            where deleted_at is null and created_at >= ? and created_at < ?
                            """,
                            cursor.atStartOfDay(CABINET_ZONE).toInstant(),
                            end.atStartOfDay(CABINET_ZONE).toInstant())
            ));
            cursor = end;
            week++;
        }
        return result;
    }

    private List<DashboardStatsResponse.ConsultationCategory> consultationsByCategory(
            Instant monthStart, Instant nextMonthStart) {
        Map<String, Long> categories = new LinkedHashMap<>();
        categories.put("Consultation / contrôle", 0L);
        categories.put("Soins conservateurs", 0L);
        categories.put("Prothèses", 0L);
        categories.put("Chirurgie", 0L);
        categories.put("Autres", 0L);

        jdbc.query("""
                        select coalesce(disease_type, '') as type, count(*) as total
                        from consultations
                        where deleted_at is null and consultation_at >= ? and consultation_at < ?
                        group by coalesce(disease_type, '')
                        """,
                preparedStatement -> {
                    preparedStatement.setTimestamp(1, java.sql.Timestamp.from(monthStart));
                    preparedStatement.setTimestamp(2, java.sql.Timestamp.from(nextMonthStart));
                },
                resultSet -> {
                    String raw = resultSet.getString("type").toLowerCase(Locale.ROOT);
                    String category = consultationCategory(raw);
                    long total = resultSet.getLong("total");
                    categories.compute(category, (key, value) ->
                            (value == null ? 0 : value) + total);
                });

        return categories.entrySet().stream()
                .map(entry -> new DashboardStatsResponse.ConsultationCategory(
                        entry.getKey(), entry.getValue()))
                .toList();
    }

    private String consultationCategory(String value) {
        if (value.contains("consult") || value.contains("contr") || value.contains("suivi")) {
            return "Consultation / contrôle";
        }
        if (value.contains("carie") || value.contains("détar") || value.contains("detar")
                || value.contains("canal") || value.contains("endo") || value.contains("blanch")) {
            return "Soins conservateurs";
        }
        if (value.contains("proth") || value.contains("couronne") || value.contains("bridge")
                || value.contains("facette") || value.contains("inlay") || value.contains("onlay")) {
            return "Prothèses";
        }
        if (value.contains("chir") || value.contains("extract") || value.contains("implant")) {
            return "Chirurgie";
        }
        return "Autres";
    }

    private List<DashboardStatsResponse.MonthlyCollections> collectionsLast6Months(
            LocalDate currentMonth) {
        List<DashboardStatsResponse.MonthlyCollections> result = new ArrayList<>();
        for (int monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
            LocalDate startDate = currentMonth.minusMonths(monthsAgo);
            LocalDate endDate = startDate.plusMonths(1);
            result.add(new DashboardStatsResponse.MonthlyCollections(
                    startDate.getMonth().getDisplayName(
                            java.time.format.TextStyle.SHORT, Locale.FRENCH),
                    amount("""
                            select coalesce(sum(amount), 0) from patient_payments
                            where cancelled_at is null and payment_date >= ? and payment_date < ?
                            """,
                            startDate.atStartOfDay(CABINET_ZONE).toInstant(),
                            endDate.atStartOfDay(CABINET_ZONE).toInstant())
            ));
        }
        return result;
    }

    private List<DashboardStatsResponse.DailyActivity> dailyActivity(LocalDate today) {
        List<DashboardStatsResponse.DailyActivity> activity = new ArrayList<>();
        for (int daysAgo = 6; daysAgo >= 0; daysAgo--) {
            LocalDate date = today.minusDays(daysAgo);
            ZonedDateTime start = date.atStartOfDay(CABINET_ZONE);
            Instant from = start.toInstant();
            Instant to = start.plusDays(1).toInstant();
            activity.add(new DashboardStatsResponse.DailyActivity(
                    date,
                    FRENCH_DAY_LABELS.get(date.getDayOfWeek().getValue() - 1),
                    count("select count(*) from appointments where starts_at >= ? and starts_at < ?", from, to),
                    count("""
                            select count(*) from consultations
                            where deleted_at is null and consultation_at >= ? and consultation_at < ?
                            """, from, to)
            ));
        }
        return activity;
    }

    private long count(String sql, Object... arguments) {
        Long value = jdbc.queryForObject(sql, Long.class, sqlArguments(arguments));
        return value == null ? 0 : value;
    }

    private BigDecimal amount(String sql, Object... arguments) {
        BigDecimal value = jdbc.queryForObject(sql, BigDecimal.class, sqlArguments(arguments));
        return value == null ? BigDecimal.ZERO : value;
    }

    private Object[] sqlArguments(Object[] arguments) {
        Object[] converted = new Object[arguments.length];
        for (int index = 0; index < arguments.length; index++) {
            Object argument = arguments[index];
            converted[index] = argument instanceof Instant instant
                    ? java.sql.Timestamp.from(instant)
                    : argument instanceof LocalDate date
                    ? java.sql.Date.valueOf(date)
                    : argument;
        }
        return converted;
    }
}
