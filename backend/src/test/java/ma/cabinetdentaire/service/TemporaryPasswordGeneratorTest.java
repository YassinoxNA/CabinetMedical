package ma.cabinetdentaire.service;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class TemporaryPasswordGeneratorTest {

    private final TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator();

    @Test
    void generatesStrongUniquePasswords() {
        Set<String> passwords = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            String password = generator.generate();
            assertThat(password)
                    .hasSize(20)
                    .matches(".*[a-z].*")
                    .matches(".*[A-Z].*")
                    .matches(".*\\d.*")
                    .matches(".*[^A-Za-z0-9].*");
            passwords.add(password);
        }
        assertThat(passwords).hasSize(100);
    }
}
