package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.dto.*;

import ma.cabinetdentaire.repository.AuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditController {

    private final AuditLogRepository repository;

    public AuditController(AuditLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @PreAuthorize("hasRole('DOCTEUR')")
    public PageResponse<AuditLogResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        return PageResponse.from(
                repository.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(page, 0), safeSize))
                        .map(AuditLogMapper::toResponse)
        );
    }

    @GetMapping("/doctor-activity")
    @PreAuthorize("hasRole('ASSISTANTE')")
    public PageResponse<AuditLogResponse> doctorActivity(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        return PageResponse.from(
                repository.findAllByUserRoleAndModuleNotOrderByCreatedAtDesc(
                                "DOCTEUR", "AUTH",
                                PageRequest.of(Math.max(page, 0), safeSize))
                        .map(AuditLogMapper::toResponse)
        );
    }
}
