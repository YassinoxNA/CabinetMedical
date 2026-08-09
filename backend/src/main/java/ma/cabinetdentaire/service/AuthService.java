package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.dto.AuthResponse;
import ma.cabinetdentaire.dto.ChangePasswordRequest;
import ma.cabinetdentaire.dto.LoginRequest;
import ma.cabinetdentaire.entity.RefreshToken;
import ma.cabinetdentaire.repository.RefreshTokenRepository;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.security.JwtTokenService;
import ma.cabinetdentaire.security.SecurityProperties;
import ma.cabinetdentaire.entity.User;
import ma.cabinetdentaire.entity.UserStatus;
import ma.cabinetdentaire.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final TokenHashService tokenHashService;
    private final SecurityProperties properties;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Clock clock = Clock.systemUTC();

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository, PasswordEncoder passwordEncoder,
                       JwtTokenService jwtTokenService, TokenHashService tokenHashService,
                       SecurityProperties properties, AuditService auditService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.tokenHashService = tokenHashService;
        this.properties = properties;
        this.auditService = auditService;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, ClientRequestInfo client) {
        authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        request.username().trim().toLowerCase(),
                        request.password()
                )
        );
        User user = requireUser(request.username());
        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new BusinessException("ACCOUNT_BLOCKED", "Ce compte est bloqué.", HttpStatus.FORBIDDEN);
        }
        user.recordLogin(clock.instant());
        String rawRefreshToken = createRefreshToken(user, client);
        auditService.record(user, "LOGIN_SUCCESS", "AUTH", "USER", user.getId(),
                "Connexion réussie.", client);
        return response(user, rawRefreshToken);
    }

    @Transactional
    public AuthResponse refresh(String rawToken, ClientRequestInfo client) {
        RefreshToken current = refreshTokenRepository.findByTokenHash(tokenHashService.hash(rawToken))
                .orElseThrow(() -> invalidRefreshToken());
        Instant now = clock.instant();
        if (!current.isUsableAt(now) || current.getUser().getStatus() == UserStatus.BLOCKED) {
            throw invalidRefreshToken();
        }
        current.revoke(now);
        String replacement = createRefreshToken(current.getUser(), client);
        return response(current.getUser(), replacement);
    }

    @Transactional
    public void logout(String rawToken, User user, ClientRequestInfo client) {
        refreshTokenRepository.findByTokenHash(tokenHashService.hash(rawToken))
                .filter(token -> token.getUser().getId().equals(user.getId()))
                .ifPresent(token -> token.revoke(clock.instant()));
        auditService.record(user, "LOGOUT", "AUTH", "USER", user.getId(),
                "Déconnexion de l’utilisateur.", client);
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request, ClientRequestInfo client) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("INVALID_CURRENT_PASSWORD",
                    "Le mot de passe actuel est incorrect.", HttpStatus.BAD_REQUEST);
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessException("PASSWORD_REUSE",
                    "Le nouveau mot de passe doit être différent.", HttpStatus.BAD_REQUEST);
        }
        user.changePassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        auditService.record(user, "PASSWORD_CHANGED", "AUTH", "USER", user.getId(),
                "Mot de passe modifié.", client);
    }

    @Transactional(readOnly = true)
    public User requireUser(String username) {
        return userRepository.findByUsernameIgnoreCase(username.trim())
                .orElseThrow(() -> new BusinessException(
                        "USER_NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
    }

    private String createRefreshToken(User user, ClientRequestInfo client) {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokenRepository.save(new RefreshToken(
                user,
                tokenHashService.hash(raw),
                clock.instant().plus(properties.refreshTokenTtl()),
                client == null ? null : client.workstation()
        ));
        return raw;
    }

    private AuthResponse response(User user, String refreshToken) {
        return new AuthResponse(
                jwtTokenService.createAccessToken(user),
                refreshToken,
                "Bearer",
                properties.accessTokenTtl().toSeconds(),
                UserMapper.toSummary(user)
        );
    }

    private BusinessException invalidRefreshToken() {
        return new BusinessException(
                "INVALID_REFRESH_TOKEN",
                "La session a expiré. Veuillez vous reconnecter.",
                HttpStatus.UNAUTHORIZED
        );
    }
}
