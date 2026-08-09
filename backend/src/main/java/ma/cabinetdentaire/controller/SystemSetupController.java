package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import ma.cabinetdentaire.repository.PatientRepository;
import ma.cabinetdentaire.service.InitialSetupService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system")
public class SystemSetupController {

    private final InitialSetupService setupService;
    private final PatientRepository patientRepository;
    private final String installationId;
    private final long installedAt;

    public SystemSetupController(InitialSetupService setupService,
                                 PatientRepository patientRepository,
                                 @Value("${app.installation.id:development}") String installationId,
                                 @Value("${app.installation.created-at:0}") long installedAt) {
        this.setupService = setupService;
        this.patientRepository = patientRepository;
        this.installationId = installationId;
        this.installedAt = installedAt;
    }

    @GetMapping("/setup-status")
    public SetupStatusResponse status() {
        return new SetupStatusResponse(setupService.isSetupRequired(), installationId, installedAt,
                patientRepository.countByDeletedAtIsNull());
    }

    @PostMapping("/initial-setup")
    @ResponseStatus(HttpStatus.CREATED)
    public InitialSetupResponse initialize() {
        return setupService.initialize();
    }
}
