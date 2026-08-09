package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.dto.CreateUserRequest;
import ma.cabinetdentaire.dto.TemporaryCredentialResponse;
import ma.cabinetdentaire.dto.UserResponse;
import ma.cabinetdentaire.entity.Role;
import ma.cabinetdentaire.entity.User;
import ma.cabinetdentaire.repository.RoleRepository;
import ma.cabinetdentaire.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordGenerator passwordGenerator;
    private final AuditService auditService;
    private final SessionRevocationService sessionRevocationService;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder, TemporaryPasswordGenerator passwordGenerator,
                       AuditService auditService, SessionRevocationService sessionRevocationService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordGenerator = passwordGenerator;
        this.auditService = auditService;
        this.sessionRevocationService = sessionRevocationService;
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> list(Pageable pageable) {
        return userRepository.findAll(pageable).map(UserMapper::toResponse);
    }

    @Transactional
    public TemporaryCredentialResponse create(CreateUserRequest request, User actor,
                                              ClientRequestInfo client) {
        String username = request.username().trim().toLowerCase();
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new BusinessException(
                    "USERNAME_ALREADY_EXISTS",
                    "Ce nom d’utilisateur existe déjà.",
                    HttpStatus.CONFLICT
            );
        }
        Role role = roleRepository.findByCode(request.role())
                .orElseThrow(() -> new IllegalStateException("Rôle introuvable"));
        String temporaryPassword = passwordGenerator.generate();
        User user = userRepository.save(new User(
                request.firstName().trim(),
                request.lastName().trim(),
                username,
                passwordEncoder.encode(temporaryPassword),
                role,
                true
        ));
        auditService.record(actor, "USER_CREATED", "USER", "USER", user.getId(),
                "Création du compte " + username + ".", client);
        return credentials(user, temporaryPassword);
    }

    @Transactional
    public UserResponse block(UUID id, User actor, ClientRequestInfo client) {
        User user = require(id);
        if (user.getId().equals(actor.getId())) {
            throw new BusinessException(
                    "SELF_BLOCK_FORBIDDEN",
                    "Vous ne pouvez pas bloquer votre propre compte.",
                    HttpStatus.BAD_REQUEST
            );
        }
        user.block();
        sessionRevocationService.revokeAll(user.getId());
        auditService.record(actor, "USER_BLOCKED", "USER", "USER", user.getId(),
                "Blocage du compte " + user.getUsername() + ".", client);
        return UserMapper.toResponse(user);
    }

    @Transactional
    public UserResponse activate(UUID id, User actor, ClientRequestInfo client) {
        User user = require(id);
        user.activate();
        auditService.record(actor, "USER_ACTIVATED", "USER", "USER", user.getId(),
                "Réactivation du compte " + user.getUsername() + ".", client);
        return UserMapper.toResponse(user);
    }

    @Transactional
    public TemporaryCredentialResponse resetPassword(UUID id, User actor, ClientRequestInfo client) {
        User user = require(id);
        String temporaryPassword = passwordGenerator.generate();
        user.resetPassword(passwordEncoder.encode(temporaryPassword));
        sessionRevocationService.revokeAll(user.getId());
        auditService.record(actor, "PASSWORD_RESET", "USER", "USER", user.getId(),
                "Réinitialisation du mot de passe de " + user.getUsername() + ".", client);
        return credentials(user, temporaryPassword);
    }

    @Transactional(readOnly = true)
    public User requireByUsername(String username) {
        return userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new BusinessException(
                        "USER_NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
    }

    private User require(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(
                        "USER_NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
    }

    private TemporaryCredentialResponse credentials(User user, String password) {
        return new TemporaryCredentialResponse(
                UserMapper.toResponse(user),
                password,
                "Ce mot de passe ne sera plus affiché et devra être changé à la première connexion."
        );
    }
}
