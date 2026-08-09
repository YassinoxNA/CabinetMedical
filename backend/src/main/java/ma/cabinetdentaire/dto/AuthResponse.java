package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.User;

import java.util.UUID;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        UserSummary user
) {
    public record UserSummary(
            UUID id,
            String username,
            String firstName,
            String lastName,
            String role,
            boolean passwordChangeRequired
    ) {
        public static UserSummary from(User user) {
            return new UserSummary(
                    user.getId(),
                    user.getUsername(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getRole().getCode().name(),
                    user.isMustChangePassword()
            );
        }
    }
}
