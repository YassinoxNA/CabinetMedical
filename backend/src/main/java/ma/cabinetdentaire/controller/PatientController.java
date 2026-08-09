package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.service.PatientService;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.UserService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
public class PatientController {

    private final PatientService patientService;
    private final UserService userService;

    public PatientController(PatientService patientService, UserService userService) {
        this.patientService = patientService;
        this.userService = userService;
    }

    @GetMapping
    public PageResponse<PatientResponse> list(@RequestParam(required = false) String q,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return PageResponse.from(patientService.list(q,
                PageRequest.of(
                        Math.max(page, 0),
                        Math.min(Math.max(size, 1), 100),
                        Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
                )));
    }

    @GetMapping("/{id}")
    public PatientResponse get(@PathVariable UUID id) {
        return patientService.get(id);
    }

    @PostMapping("/duplicates")
    public DuplicatePatientResponse duplicates(@Valid @RequestBody PatientRequest request) {
        return patientService.duplicates(request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PatientResponse create(@Valid @RequestBody PatientRequest request,
                                  @RequestParam(defaultValue = "false") boolean duplicateConfirmed,
                                  @AuthenticationPrincipal AuthenticatedUser principal,
                                  HttpServletRequest servletRequest) {
        return patientService.create(request, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest), duplicateConfirmed);
    }

    @PutMapping("/{id}")
    public PatientResponse update(@PathVariable UUID id, @Valid @RequestBody PatientRequest request,
                                  @AuthenticationPrincipal AuthenticatedUser principal,
                                  HttpServletRequest servletRequest) {
        return patientService.update(id, request, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DOCTEUR')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable UUID id,
                        @AuthenticationPrincipal AuthenticatedUser principal,
                        HttpServletRequest servletRequest) {
        patientService.archive(id, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }
}
