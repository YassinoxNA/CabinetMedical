package ma.cabinetdentaire.dto;

public record TemporaryCredentialResponse(
        UserResponse user,
        String temporaryPassword,
        String warning
) {
}
