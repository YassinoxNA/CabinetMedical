package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.dto.TreatmentPlanRequest;
import ma.cabinetdentaire.dto.TreatmentPlanResponse;
import ma.cabinetdentaire.entity.TreatmentPlan;
import ma.cabinetdentaire.repository.TreatmentPlanRepository;
import ma.cabinetdentaire.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class TreatmentPlanService {

    private final TreatmentPlanRepository repository;
    private final PatientService patientService;
    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;
    private final Clock clock = Clock.systemUTC();

    public TreatmentPlanService(TreatmentPlanRepository repository, PatientService patientService,
                                JdbcTemplate jdbcTemplate, AuditService auditService) {
        this.repository = repository;
        this.patientService = patientService;
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<TreatmentPlanResponse> list(UUID patientId) {
        patientService.requireEntity(patientId);
        return repository.findAllByPatientIdAndDeletedAtIsNullOrderByStartDateDesc(patientId)
                .stream().map(TreatmentPlanMapper::toResponse).toList();
    }

    @Transactional
    public TreatmentPlanResponse create(UUID patientId, TreatmentPlanRequest request,
                                        User actor, ClientRequestInfo client) {
        var patient = patientService.requireEntity(patientId);
        Long sequence = jdbcTemplate.queryForObject(
                "select nextval('treatment_plan_number_seq')", Long.class);
        String number = "PLN-%d-%06d".formatted(LocalDate.now().getYear(), sequence);
        TreatmentPlan plan = repository.save(new TreatmentPlan(
                patient, number, request.title(), request.startDate(), request.notes()));
        auditService.record(actor, "TREATMENT_PLAN_CREATED", "TREATMENT", "TREATMENT_PLAN",
                plan.getId(), "Création du plan " + number + ".", client);
        return TreatmentPlanMapper.toResponse(plan);
    }

    @Transactional
    public TreatmentPlanResponse complete(UUID id, User actor, ClientRequestInfo client) {
        TreatmentPlan plan = require(id);
        plan.complete(clock.instant());
        auditService.record(actor, "TREATMENT_PLAN_COMPLETED", "TREATMENT", "TREATMENT_PLAN",
                id, "Plan de traitement terminé.", client);
        return TreatmentPlanMapper.toResponse(plan);
    }

    public TreatmentPlan requireEntity(UUID id) {
        return require(id);
    }

    private TreatmentPlan require(UUID id) {
        return repository.findById(id).orElseThrow(() -> new BusinessException(
                "TREATMENT_PLAN_NOT_FOUND", "Plan de traitement introuvable.", HttpStatus.NOT_FOUND));
    }
}
