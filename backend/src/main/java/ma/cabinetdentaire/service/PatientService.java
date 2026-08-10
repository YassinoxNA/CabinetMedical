package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.dto.DuplicatePatientResponse;
import ma.cabinetdentaire.dto.PatientRequest;
import ma.cabinetdentaire.dto.PatientResponse;
import ma.cabinetdentaire.entity.CoverageType;
import ma.cabinetdentaire.entity.Patient;
import ma.cabinetdentaire.repository.PatientRepository;
import ma.cabinetdentaire.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

@Service
public class PatientService {

    private final PatientRepository repository;
    private final PatientNumberGenerator numberGenerator;
    private final AuditService auditService;
    private final Clock clock = Clock.systemUTC();

    public PatientService(PatientRepository repository, PatientNumberGenerator numberGenerator,
                          AuditService auditService) {
        this.repository = repository;
        this.numberGenerator = numberGenerator;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<PatientResponse> list(String query, Pageable pageable) {
        Page<Patient> page = query == null || query.isBlank()
                ? repository.findAllByDeletedAtIsNullAndArchivedAtIsNull(pageable)
                : repository.search(query.trim(), pageable);
        return page.map(PatientMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public PatientResponse get(UUID id) {
        return PatientMapper.toResponse(require(id));
    }

    @Transactional(readOnly = true)
    public DuplicatePatientResponse duplicates(PatientRequest request) {
        List<Patient> matches = findDuplicates(request);
        return new DuplicatePatientResponse(
                !matches.isEmpty(),
                matches.isEmpty() ? null : "Un patient similaire existe déjà. Voulez-vous ouvrir son dossier ?",
                matches.stream().map(PatientMapper::toResponse).toList()
        );
    }

    @Transactional
    public PatientResponse create(PatientRequest request, User actor, ClientRequestInfo client,
                                  boolean duplicateConfirmed) {
        List<Patient> matches = findDuplicates(request);
        if (!matches.isEmpty() && !duplicateConfirmed) {
            throw new BusinessException(
                    "POSSIBLE_DUPLICATE_PATIENT",
                    "Un patient similaire existe déjà. Vérifiez son dossier avant de continuer.",
                    HttpStatus.CONFLICT
            );
        }
        Patient patient = new Patient(
                numberGenerator.next(), clean(request.firstName()), clean(request.lastName()),
                cleanNullable(request.cin()), normalizePhone(request.primaryPhone()),
                request.birthDate(), coverageOrDefault(request.coverageType())
        );
        apply(patient, request);
        repository.save(patient);
        auditService.record(actor, "PATIENT_CREATED", "PATIENT", "PATIENT", patient.getId(),
                "Création du patient " + patient.getPatientNumber() + ".", client);
        return PatientMapper.toResponse(patient);
    }

    @Transactional
    public PatientResponse update(UUID id, PatientRequest request, User actor, ClientRequestInfo client) {
        Patient patient = require(id);
        apply(patient, request);
        auditService.record(actor, "PATIENT_UPDATED", "PATIENT", "PATIENT", patient.getId(),
                "Modification administrative du patient " + patient.getPatientNumber() + ".", client);
        return PatientMapper.toResponse(patient);
    }

    @Transactional
    public void archive(UUID id, User actor, ClientRequestInfo client) {
        Patient patient = require(id);
        patient.archive(clock.instant());
        auditService.record(actor, "PATIENT_ARCHIVED", "PATIENT", "PATIENT", patient.getId(),
                "Archivage du patient " + patient.getPatientNumber() + ".", client);
    }

    public Patient requireEntity(UUID id) {
        return require(id);
    }

    private Patient require(UUID id) {
        return repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException(
                        "PATIENT_NOT_FOUND", "Patient introuvable.", HttpStatus.NOT_FOUND));
    }

    private List<Patient> findDuplicates(PatientRequest request) {
        LinkedHashMap<UUID, Patient> matches = new LinkedHashMap<>();
        if (request.cin() != null && !request.cin().isBlank()) {
            repository.findByCinIgnoreCaseAndDeletedAtIsNull(request.cin().trim())
                    .ifPresent(patient -> matches.put(patient.getId(), patient));
        }
        matchesFrom(repository.findTop10ByPrimaryPhoneAndDeletedAtIsNull(
                normalizePhone(request.primaryPhone())), matches);
        if (request.birthDate() != null) {
            matchesFrom(repository
                    .findTop10ByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndBirthDateAndDeletedAtIsNull(
                            request.firstName().trim(), request.lastName().trim(), request.birthDate()), matches);
        }
        return List.copyOf(matches.values());
    }

    private void matchesFrom(List<Patient> source, LinkedHashMap<UUID, Patient> target) {
        source.forEach(patient -> target.put(patient.getId(), patient));
    }

    private void apply(Patient patient, PatientRequest request) {
        patient.updateAdministrative(
                clean(request.firstName()), clean(request.lastName()), cleanNullable(request.cin()),
                normalizePhone(request.primaryPhone()), cleanNullable(request.secondaryPhone()),
                cleanNullable(request.address()), cleanNullable(request.city()), request.birthDate(),
                cleanNullable(request.sex()), cleanNullable(request.email()), coverageOrDefault(request.coverageType()),
                cleanNullable(request.membershipNumber()), cleanNullable(request.allergies()),
                cleanNullable(request.medicalHistory()), cleanNullable(request.observations())
        );
    }

    private String normalizePhone(String value) {
        return value == null ? null : value.replaceAll("[^0-9+]", "");
    }

    private CoverageType coverageOrDefault(CoverageType coverageType) {
        return coverageType == null ? CoverageType.SANS_ASSURANCE : coverageType;
    }

    private String clean(String value) {
        return value.trim().replaceAll("\\s+", " ");
    }

    private String cleanNullable(String value) {
        return value == null || value.isBlank() ? null : clean(value);
    }
}
