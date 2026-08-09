package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.TreatmentPlanService;
import ma.cabinetdentaire.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class TreatmentPlanController {
    private final TreatmentPlanService service;
    private final UserService userService;

    public TreatmentPlanController(TreatmentPlanService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    @GetMapping("/patients/{patientId}/treatment-plans")
    public List<TreatmentPlanResponse> list(@PathVariable UUID patientId) {
        return service.list(patientId);
    }

    @PostMapping("/patients/{patientId}/treatment-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public TreatmentPlanResponse create(@PathVariable UUID patientId,
                                        @Valid @RequestBody TreatmentPlanRequest request,
                                        @AuthenticationPrincipal AuthenticatedUser principal,
                                        HttpServletRequest servletRequest) {
        return service.create(patientId, request, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }

    @PostMapping("/treatment-plans/{id}/complete")
    @PreAuthorize("hasRole('DOCTEUR')")
    public TreatmentPlanResponse complete(@PathVariable UUID id,
                                          @AuthenticationPrincipal AuthenticatedUser principal,
                                          HttpServletRequest servletRequest) {
        return service.complete(id, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }
}
