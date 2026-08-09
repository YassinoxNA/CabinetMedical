package ma.cabinetdentaire.service;
import ma.cabinetdentaire.mapper.LaboratoryMapper;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.dto.LaboratoryRequests.*;
import ma.cabinetdentaire.dto.LaboratoryResponses.*;
import ma.cabinetdentaire.entity.*;
import ma.cabinetdentaire.repository.*;
import ma.cabinetdentaire.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service
public class LaboratoryService {
    private final LaboratoryRepository labs; private final LaboratoryJobRepository jobs;
    private final PatientService patients; private final PatientRepository patientRepository; private final AuditService audit;
    public LaboratoryService(LaboratoryRepository labs, LaboratoryJobRepository jobs, PatientService patients, PatientRepository patientRepository, AuditService audit) {
        this.labs=labs; this.jobs=jobs; this.patients=patients; this.patientRepository=patientRepository; this.audit=audit;
    }
    @Transactional(readOnly=true) public List<LaboratoryResponse> list() { return labs.findAll().stream().map(LaboratoryMapper::toResponse).toList(); }
    @Transactional(readOnly=true) public List<JobResponse> jobs() { return jobs.findAllByOrderByExpectedDateDesc().stream().map(LaboratoryMapper::toResponse).toList(); }
    @Transactional(readOnly=true) public List<EligiblePatientTreatmentResponse> eligiblePatients() {
        return patientRepository.findEligibleLaboratoryTreatments().stream()
                .map(item -> new EligiblePatientTreatmentResponse(item.getPatientId(), item.getPatientNumber(),
                        item.getFirstName(), item.getLastName(), item.getCin(), item.getPrimaryPhone(),
                        item.getTreatmentType()))
                .toList();
    }
    @Transactional public LaboratoryResponse create(CreateLaboratory r, User actor, ClientRequestInfo client) {
        long sequence = labs.count() + 1;
        String laboratoryNumber;
        do {
            laboratoryNumber = "LAB-%06d".formatted(sequence++);
        } while (labs.existsByTaxIdentifier(laboratoryNumber));
        Laboratory lab=labs.save(new Laboratory(r.name(),r.managerName(),r.phone(),r.email(),r.address(),r.city(),laboratoryNumber,null));
        audit.record(actor,"LABORATORY_CREATED","LABORATORY","LABORATORY",lab.getId(),"Création du laboratoire "+lab.getName()+".",client);
        return LaboratoryMapper.toResponse(lab);
    }
    @Transactional public JobResponse createJob(CreateJob r, User actor, ClientRequestInfo client) {
        Laboratory lab=labs.findById(r.laboratoryId()).orElseThrow(()->new BusinessException("LAB_NOT_FOUND","Laboratoire introuvable.",HttpStatus.NOT_FOUND));
        var patient=patients.requireEntity(r.patientId());
        boolean eligible = patientRepository.findEligibleLaboratoryTreatments().stream().anyMatch(candidate ->
                candidate.getPatientId().equals(patient.getId()) && candidate.getTreatmentType().equals(r.jobType()));
        if (!eligible) throw new BusinessException("PATIENT_NOT_LAB_ELIGIBLE","Ce patient ne possède aucun soin nécessitant un travail de laboratoire.",HttpStatus.UNPROCESSABLE_ENTITY);
        LaboratoryJob job=jobs.save(new LaboratoryJob(lab,patient,r.jobType(),r.tooth(),r.shade(),r.description(),r.sentDate(),r.expectedDate(),r.laboratoryPrice(),r.notes()));
        audit.record(actor,"LAB_JOB_CREATED","LABORATORY","LABORATORY_JOB",job.getId(),"Création d’un travail laboratoire.",client);
        return LaboratoryMapper.toResponse(job);
    }
    @Transactional public JobResponse status(UUID id, LaboratoryJob.Status status, User actor, ClientRequestInfo client) {
        LaboratoryJob job=jobs.findById(id).orElseThrow(()->new BusinessException("LAB_JOB_NOT_FOUND","Travail laboratoire introuvable.",HttpStatus.NOT_FOUND));
        job.changeStatus(status); audit.record(actor,"LAB_JOB_STATUS_CHANGED","LABORATORY","LABORATORY_JOB",id,"Nouveau statut : "+status,client);
        return LaboratoryMapper.toResponse(job);
    }
}
