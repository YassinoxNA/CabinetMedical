package ma.cabinetdentaire.controller;

import jakarta.validation.Valid;
import ma.cabinetdentaire.dto.SettingRequest;
import ma.cabinetdentaire.dto.SettingResponse;
import ma.cabinetdentaire.entity.Setting;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.mapper.SettingMapper;
import ma.cabinetdentaire.repository.SettingRepository;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.OfficeHoursValidator;
import ma.cabinetdentaire.service.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {
    private final SettingRepository repository;
    private final UserService users;
    private final OfficeHoursValidator officeHoursValidator;

    public SettingsController(SettingRepository repository, UserService users,
                              OfficeHoursValidator officeHoursValidator) {
        this.repository = repository;
        this.users = users;
        this.officeHoursValidator = officeHoursValidator;
    }

    @GetMapping
    public List<SettingResponse> list() {
        return repository.findAll().stream()
                .filter(setting -> !setting.isSensitive())
                .map(SettingMapper::toResponse)
                .toList();
    }

    @PutMapping
    @PreAuthorize("hasRole('DOCTEUR')")
    @Transactional
    public SettingResponse put(@Valid @RequestBody SettingRequest request,
                               @AuthenticationPrincipal AuthenticatedUser principal) {
        if (request.key().startsWith("cabinet.")) {
            throw new BusinessException("CABINET_IDENTITY_READ_ONLY",
                    "Les informations officielles du cabinet sont en lecture seule.",
                    HttpStatus.FORBIDDEN);
        }
        validatePlanningSetting(request);
        var actor = users.requireByUsername(principal.username());
        Setting setting = repository.findById(request.key())
                .orElseGet(() -> new Setting(request.key(), request.value(),
                        request.valueType(), false, actor.getId()));
        setting.update(request.value(), actor.getId());
        return SettingMapper.toResponse(repository.save(setting));
    }

    private void validatePlanningSetting(SettingRequest request) {
        if ("appointment.defaultDuration".equals(request.key())) {
            try {
                int duration = Integer.parseInt(request.value());
                if (duration < 15 || duration > 60 || duration % 15 != 0) {
                    throw new NumberFormatException();
                }
            } catch (NumberFormatException exception) {
                throw new BusinessException("INVALID_APPOINTMENT_DURATION",
                        "La durée doit être comprise entre 15 et 60 minutes, par pas de 15 minutes.",
                        HttpStatus.BAD_REQUEST);
            }
        }
        if (request.key().startsWith("appointment.schedule.")) {
            officeHoursValidator.validateConfiguredSchedule(request.value());
        }
    }
}
