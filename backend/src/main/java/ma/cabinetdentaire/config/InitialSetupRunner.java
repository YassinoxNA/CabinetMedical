package ma.cabinetdentaire.config;

import ma.cabinetdentaire.service.InitialSetupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class InitialSetupRunner implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(InitialSetupRunner.class);

    private final InitialSetupService setupService;

    public InitialSetupRunner(InitialSetupService setupService) {
        this.setupService = setupService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!setupService.isSetupRequired()) {
            setupService.ensureSharedAccount();
            LOGGER.info("Compte partagé du cabinet vérifié.");
            return;
        }
        setupService.initialize();
        LOGGER.info("Comptes initiaux du cabinet créés automatiquement.");
    }
}
