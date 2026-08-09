package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.service.AuthService;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        return authService.login(request, ClientRequestInfo.from(servletRequest));
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest servletRequest) {
        return authService.refresh(request.refreshToken(), ClientRequestInfo.from(servletRequest));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request,
                       @AuthenticationPrincipal AuthenticatedUser principal,
                       HttpServletRequest servletRequest) {
        User user = authService.requireUser(principal.username());
        authService.logout(request.refreshToken(), user, ClientRequestInfo.from(servletRequest));
    }

    @GetMapping("/me")
    public AuthResponse.UserSummary me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return UserMapper.toSummary(authService.requireUser(principal.username()));
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request,
                               @AuthenticationPrincipal AuthenticatedUser principal,
                               HttpServletRequest servletRequest) {
        User user = authService.requireUser(principal.username());
        authService.changePassword(user, request, ClientRequestInfo.from(servletRequest));
    }
}
