package ma.cabinetdentaire.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TokenHashServiceTest {

    private final TokenHashService service = new TokenHashService();

    @Test
    void returnsStableSha256WithoutExposingTheToken() {
        String token = "un-refresh-token-secret";
        String hash = service.hash(token);

        assertThat(hash)
                .hasSize(64)
                .isEqualTo(service.hash(token))
                .doesNotContain(token);
    }
}
