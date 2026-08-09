package ma.cabinetdentaire.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.initial-accounts")
public record InitialAccountProperties(
        String doctorUsername,
        String doctorPassword,
        String assistantUsername,
        String assistantPassword
) {
    public String doctorUsernameOr(String fallback) {
        return doctorUsername == null || doctorUsername.isBlank() ? fallback : doctorUsername;
    }

    public String doctorPasswordOr(String fallback) {
        return doctorPassword == null || doctorPassword.isBlank() ? fallback : doctorPassword;
    }

    public String assistantPasswordOr(String fallback) {
        return assistantPassword == null || assistantPassword.isBlank() ? fallback : assistantPassword;
    }

    public String assistantUsernameOr(String fallback) {
        return assistantUsername == null || assistantUsername.isBlank() ? fallback : assistantUsername;
    }
}
