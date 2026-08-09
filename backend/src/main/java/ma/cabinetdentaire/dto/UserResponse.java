package ma.cabinetdentaire.dto;

import ma.cabinetdentaire.entity.User;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String firstName,
        String lastName,
        String username,
        String role,
        String status,
        boolean passwordChangeRequired,
        Instant lastLoginAt,
        Instant createdAt,
        long version
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getUsername(),
                user.getRole().getCode().name(),
                user.getStatus().name(),
                user.isMustChangePassword(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                user.getVersion()
        );
    }
}
