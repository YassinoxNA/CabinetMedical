package ma.cabinetdentaire.dto;

public record InitialSetupResponse(
        String doctorUsername,
        String doctorTemporaryPassword,
        String assistantUsername,
        String assistantTemporaryPassword,
        String warning
) {
}
