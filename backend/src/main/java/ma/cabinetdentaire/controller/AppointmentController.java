package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.AppointmentService;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.UserService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appointments")
public class AppointmentController {

    private final AppointmentService service;
    private final UserService userService;

    public AppointmentController(AppointmentService service, UserService userService) {
        this.service = service;
        this.userService = userService;
    }

    @GetMapping
    public List<AppointmentResponse> calendar(@RequestParam Instant from, @RequestParam Instant to) {
        return service.calendar(from, to);
    }

    @GetMapping("/patients/{patientId}/dossier-access")
    public PatientDossierAccessResponse dossierAccess(@PathVariable UUID patientId) {
        return service.dossierAccess(patientId);
    }

    @GetMapping("/available-times")
    public List<String> availableTimes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID excludedId) {
        return service.availableTimes(date, excludedId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentResponse create(@Valid @RequestBody AppointmentRequest request,
                                      @AuthenticationPrincipal AuthenticatedUser principal,
                                      HttpServletRequest servletRequest) {
        return service.create(request, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }

    @PutMapping("/{id}")
    public AppointmentResponse update(@PathVariable UUID id,
                                      @Valid @RequestBody AppointmentRequest request,
                                      @AuthenticationPrincipal AuthenticatedUser principal,
                                      HttpServletRequest servletRequest) {
        return service.update(id, request, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }

    @PostMapping("/{id}/arrived")
    public AppointmentResponse arrived(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal,
                                       HttpServletRequest servletRequest) {
        return service.arrived(id, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }

    @PostMapping("/{id}/confirm")
    public AppointmentResponse confirm(@PathVariable UUID id,
                                       @AuthenticationPrincipal AuthenticatedUser principal,
                                       HttpServletRequest servletRequest) {
        return service.confirm(id, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }

    @PostMapping("/{id}/cancel")
    public AppointmentResponse cancel(@PathVariable UUID id,
                                      @Valid @RequestBody CancelAppointmentRequest request,
                                      @AuthenticationPrincipal AuthenticatedUser principal,
                                      HttpServletRequest servletRequest) {
        return service.cancel(id, request.reason(), userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(servletRequest));
    }
}
