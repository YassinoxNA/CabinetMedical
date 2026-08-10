package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.service.InvoiceService;
import ma.cabinetdentaire.dto.PaymentRequest;
import ma.cabinetdentaire.dto.PaymentResponse;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class InvoiceController {
    private final InvoiceService service;
    private final UserService users;
    public InvoiceController(InvoiceService service, UserService users) {
        this.service = service; this.users = users;
    }
    @PostMapping("/patient-invoices") @ResponseStatus(HttpStatus.CREATED)
    public InvoiceResponse create(@Valid @RequestBody InvoiceRequest request,
                                  @AuthenticationPrincipal AuthenticatedUser principal,
                                  HttpServletRequest http) {
        return service.create(request, users.requireByUsername(principal.username()), ClientRequestInfo.from(http));
    }
    @GetMapping("/patient-invoices/{id}")
    public InvoiceResponse get(@PathVariable UUID id) { return service.get(id); }
    @PutMapping("/patient-invoices/{id}")
    public InvoiceResponse update(@PathVariable UUID id,
                                  @Valid @RequestBody InvoiceRequest request,
                                  @AuthenticationPrincipal AuthenticatedUser principal,
                                  HttpServletRequest http) {
        return service.update(id, request, users.requireByUsername(principal.username()), ClientRequestInfo.from(http));
    }
    @DeleteMapping("/patient-invoices/{id}")
    @PreAuthorize("hasRole('DOCTEUR')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal AuthenticatedUser principal,
                       HttpServletRequest http) {
        service.delete(id, users.requireByUsername(principal.username()), ClientRequestInfo.from(http));
    }
    @GetMapping("/patients/{patientId}/invoices")
    public List<InvoiceResponse> patientInvoices(@PathVariable UUID patientId) {
        return service.byPatient(patientId);
    }
    @PostMapping("/patient-invoices/{id}/validate")
    public InvoiceResponse validate(@PathVariable UUID id,
                                    @AuthenticationPrincipal AuthenticatedUser principal,
                                    HttpServletRequest http) {
        return service.validate(id, users.requireByUsername(principal.username()), ClientRequestInfo.from(http));
    }
    @PostMapping("/patient-payments") @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse pay(@Valid @RequestBody PaymentRequest request,
                               @AuthenticationPrincipal AuthenticatedUser principal,
                               HttpServletRequest http) {
        return service.pay(request, users.requireByUsername(principal.username()), ClientRequestInfo.from(http));
    }

    @GetMapping("/patients/{patientId}/payments")
    public List<PaymentResponse> payments(@PathVariable UUID patientId) {
        return service.paymentsByPatient(patientId);
    }
}
