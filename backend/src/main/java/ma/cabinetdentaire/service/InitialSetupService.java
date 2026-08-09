package ma.cabinetdentaire.service;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.config.InitialAccountProperties;
import ma.cabinetdentaire.dto.InitialSetupResponse;
import ma.cabinetdentaire.entity.Role;
import ma.cabinetdentaire.entity.RoleCode;
import ma.cabinetdentaire.entity.User;
import ma.cabinetdentaire.repository.RoleRepository;
import ma.cabinetdentaire.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InitialSetupService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TemporaryPasswordGenerator passwordGenerator;
    private final InitialAccountProperties initialAccounts;

    public InitialSetupService(UserRepository userRepository, RoleRepository roleRepository,
                               PasswordEncoder passwordEncoder,
                               TemporaryPasswordGenerator passwordGenerator,
                               InitialAccountProperties initialAccounts) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordGenerator = passwordGenerator;
        this.initialAccounts = initialAccounts;
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public InitialSetupResponse initialize() {
        if (userRepository.count() > 0) {
            throw new BusinessException(
                    "SETUP_ALREADY_COMPLETED",
                    "La première installation a déjà été effectuée.",
                    HttpStatus.CONFLICT
            );
        }

        Role doctorRole = requireRole(RoleCode.DOCTEUR);
        String doctorPassword = initialAccounts.doctorPasswordOr(passwordGenerator.generate());
        String doctorUsername = initialAccounts.doctorUsernameOr("docteur");

        userRepository.save(new User(
                "Cabinet", "Dentaire", doctorUsername,
                passwordEncoder.encode(doctorPassword), doctorRole, false
        ));

        return new InitialSetupResponse(
                doctorUsername,
                doctorPassword,
                doctorUsername,
                doctorPassword,
                "Compte partagé du cabinet créé avec les droits complets."
        );
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void ensureSharedAccount() {
        String username = initialAccounts.doctorUsernameOr("cabine@SabriDental.com");
        User shared = userRepository.findByUsernameIgnoreCase(username).orElseGet(() -> {
            Role doctorRole = requireRole(RoleCode.DOCTEUR);
            String password = initialAccounts.doctorPasswordOr(passwordGenerator.generate());
            return userRepository.save(new User(
                    "Cabinet", "Dentaire", username,
                    passwordEncoder.encode(password), doctorRole, false
            ));
        });
        shared.activate();
        userRepository.findAll().stream()
                .filter(user -> !user.getUsername().equalsIgnoreCase(username))
                .forEach(User::block);
    }

    @Transactional(readOnly = true)
    public boolean isSetupRequired() {
        return userRepository.count() == 0;
    }

    private Role requireRole(RoleCode code) {
        return roleRepository.findByCode(code)
                .orElseThrow(() -> new IllegalStateException("Rôle initial manquant : " + code));
    }
}
