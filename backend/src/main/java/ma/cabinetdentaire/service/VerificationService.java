package ma.cabinetdentaire.service;
import ma.cabinetdentaire.mapper.VerificationMapper;
import ma.cabinetdentaire.service.*;import ma.cabinetdentaire.entity.VerificationStatus;import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.entity.User;import ma.cabinetdentaire.dto.VerificationModels.Response;import ma.cabinetdentaire.entity.VerificationRequest;
import ma.cabinetdentaire.repository.VerificationRequestRepository;import org.springframework.data.domain.*;import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;
import java.time.*;import java.util.*;
@Service public class VerificationService {
 private static final Map<String,String> TABLES=Map.ofEntries(
  Map.entry("PATIENT","patients"),Map.entry("CONSULTATION","consultations"),Map.entry("APPOINTMENT","appointments"),
  Map.entry("PATIENT_INVOICE","patient_invoices"),Map.entry("PATIENT_PAYMENT","patient_payments"),
  Map.entry("TREATMENT_PLAN","treatment_plans"),Map.entry("LABORATORY_JOB","laboratory_jobs"),
  Map.entry("SUPPLIER_INVOICE","supplier_invoices"),Map.entry("SUPPLIER_PAYMENT","supplier_payments"));
 private final VerificationRequestRepository repository;private final JdbcTemplate jdbc;private final AuditService audit;private final Clock clock=Clock.systemUTC();
 public VerificationService(VerificationRequestRepository r,JdbcTemplate j,AuditService a){repository=r;jdbc=j;audit=a;}
 @Transactional(readOnly=true) public Page<Response> pending(Pageable p){return repository.findAllByStatusOrderByCreatedAtAsc(VerificationStatus.EN_ATTENTE_VERIFICATION,p).map(VerificationMapper::toResponse);}
 @Transactional public Response submit(String type,UUID entityId,UUID patientId,User actor){
  checkType(type);return VerificationMapper.toResponse(repository.save(new VerificationRequest(type,entityId,patientId,actor.getId())));}
 @Transactional public Response decide(String type,UUID entityId,VerificationStatus status,String comment,User doctor,ClientRequestInfo client){
  if(status!=VerificationStatus.VERIFIE_PAR_DOCTEUR&&status!=VerificationStatus.A_CORRIGER&&status!=VerificationStatus.ANNULE)
   throw new BusinessException("INVALID_VERIFICATION_DECISION","Décision de vérification invalide.",HttpStatus.BAD_REQUEST);
  String table=checkType(type);int updated=jdbc.update("update "+table+" set verification_status=?, version=version+1 where id=?",status.name(),entityId);
  if(updated==0)throw new BusinessException("ENTITY_NOT_FOUND","Opération introuvable.",HttpStatus.NOT_FOUND);
  VerificationRequest request=repository.findFirstByEntityTypeAndEntityIdOrderByCreatedAtDesc(type,entityId)
   .orElseGet(()->repository.save(new VerificationRequest(type,entityId,null,null)));
  request.decide(status,comment,doctor.getId(),clock.instant());
  audit.record(doctor,"VERIFICATION_"+status.name(),"VERIFICATION",type,entityId,"Décision du docteur : "+status+(comment==null?"":" — "+comment),client);
  return VerificationMapper.toResponse(request);
 }
 private String checkType(String type){String table=TABLES.get(type.toUpperCase());if(table==null)throw new BusinessException("UNSUPPORTED_ENTITY_TYPE","Type non vérifiable.",HttpStatus.BAD_REQUEST);return table;}
}
