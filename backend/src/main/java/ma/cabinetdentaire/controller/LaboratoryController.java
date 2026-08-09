package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.service.LaboratoryService;
import ma.cabinetdentaire.entity.LaboratoryJob;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static ma.cabinetdentaire.dto.LaboratoryRequests.*;
import static ma.cabinetdentaire.dto.LaboratoryResponses.*;
@RestController @RequestMapping("/api/v1")
public class LaboratoryController {
    private final LaboratoryService service; private final UserService users;
    public LaboratoryController(LaboratoryService service, UserService users){this.service=service;this.users=users;}
    @GetMapping("/laboratories") public List<LaboratoryResponse> list(){return service.list();}
    @GetMapping("/laboratory-jobs") public List<JobResponse> jobs(){return service.jobs();}
    @GetMapping("/laboratory-jobs/eligible-patients") public List<EligiblePatientTreatmentResponse> eligiblePatients(){return service.eligiblePatients();}
    @PostMapping("/laboratories") @ResponseStatus(HttpStatus.CREATED)
    public LaboratoryResponse create(@Valid @RequestBody CreateLaboratory r,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){
        return service.create(r,users.requireByUsername(p.username()),ClientRequestInfo.from(h));}
    @PostMapping("/laboratory-jobs") @ResponseStatus(HttpStatus.CREATED)
    public JobResponse job(@Valid @RequestBody CreateJob r,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){
        return service.createJob(r,users.requireByUsername(p.username()),ClientRequestInfo.from(h));}
    @PostMapping("/laboratory-jobs/{id}/status")
    public JobResponse status(@PathVariable UUID id,@RequestParam LaboratoryJob.Status status,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){
        return service.status(id,status,users.requireByUsername(p.username()),ClientRequestInfo.from(h));}
}
