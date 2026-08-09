package ma.cabinetdentaire.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record DashboardStatsResponse(
        Instant generatedAt,
        long totalPatients,
        long newPatientsThisMonth,
        long appointmentsToday,
        long appointmentsPlannedToday,
        long appointmentsCompletedToday,
        long appointmentsCancelledToday,
        long consultationsThisMonth,
        BigDecimal billedThisMonth,
        BigDecimal collectedThisMonth,
        BigDecimal outstandingTotal,
        long laboratoryJobsInProgress,
        List<DailyActivity> activityLast7Days,
        List<WeeklyPatients> newPatientsByWeek,
        List<ConsultationCategory> consultationsByCategory,
        List<MonthlyCollections> collectionsLast6Months
) {
    public record DailyActivity(
            LocalDate date,
            String label,
            long appointments,
            long consultations
    ) {}

    public record WeeklyPatients(String label, long patients) {}

    public record ConsultationCategory(String category, long consultations) {}

    public record MonthlyCollections(String label, BigDecimal amount) {}
}
