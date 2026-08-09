package ma.cabinetdentaire.security;

import ma.cabinetdentaire.entity.RoleCode;

import java.util.UUID;

public record AuthenticatedUser(
        UUID id,
        String username,
        RoleCode role,
        boolean passwordChangeRequired
) {
}
