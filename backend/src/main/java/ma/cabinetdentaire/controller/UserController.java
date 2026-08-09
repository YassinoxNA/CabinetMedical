package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.UserService;
import ma.cabinetdentaire.entity.User;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('DOCTEUR')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public PageResponse<UserResponse> list(@RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        return PageResponse.from(
                userService.list(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)))
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemporaryCredentialResponse create(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal AuthenticatedUser principal,
            HttpServletRequest servletRequest
    ) {
        return userService.create(request, actor(principal), ClientRequestInfo.from(servletRequest));
    }

    @PostMapping("/{id}/block")
    public UserResponse block(@PathVariable UUID id,
                              @AuthenticationPrincipal AuthenticatedUser principal,
                              HttpServletRequest request) {
        return userService.block(id, actor(principal), ClientRequestInfo.from(request));
    }

    @PostMapping("/{id}/activate")
    public UserResponse activate(@PathVariable UUID id,
                                 @AuthenticationPrincipal AuthenticatedUser principal,
                                 HttpServletRequest request) {
        return userService.activate(id, actor(principal), ClientRequestInfo.from(request));
    }

    @PostMapping("/{id}/reset-password")
    public TemporaryCredentialResponse resetPassword(
            @PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser principal,
            HttpServletRequest request
    ) {
        return userService.resetPassword(id, actor(principal), ClientRequestInfo.from(request));
    }

    private User actor(AuthenticatedUser principal) {
        return userService.requireByUsername(principal.username());
    }
}
