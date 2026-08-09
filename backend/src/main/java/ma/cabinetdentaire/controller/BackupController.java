package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.service.BackupService;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/backups")
@PreAuthorize("hasAnyRole('DOCTEUR','ASSISTANTE')")
public class BackupController {
    private final BackupService service;
    private final UserService users;

    public BackupController(BackupService service, UserService users) {
        this.service = service;
        this.users = users;
    }

    @PostMapping
    public BackupResponse create(@AuthenticationPrincipal AuthenticatedUser principal,
                                 HttpServletRequest request) {
        return service.create(users.requireByUsername(principal.username()),
                ClientRequestInfo.from(request));
    }

    @GetMapping
    public List<BackupResponse> history() {
        return service.history();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        var file = service.downloadableFile(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.getFileName().toString()).build().toString())
                .body(new FileSystemResource(file));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('DOCTEUR')")
    public Map<String, String> restoreExisting(@PathVariable UUID id,
                                               @AuthenticationPrincipal AuthenticatedUser principal,
                                               HttpServletRequest request) {
        service.restoreExisting(id, users.requireByUsername(principal.username()), ClientRequestInfo.from(request));
        return Map.of("message", "Restauration terminée avec succès.");
    }

    @PostMapping(value = "/restore", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DOCTEUR')")
    public Map<String, String> restoreUploaded(@RequestPart("file") MultipartFile file,
                                               @AuthenticationPrincipal AuthenticatedUser principal,
                                               HttpServletRequest request) throws java.io.IOException {
        service.restoreUploaded(file.getInputStream(), file.getOriginalFilename(), file.getSize(),
                users.requireByUsername(principal.username()), ClientRequestInfo.from(request));
        return Map.of("message", "Restauration terminée avec succès.");
    }
}
