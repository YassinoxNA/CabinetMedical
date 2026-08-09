package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.AuthResponse;
import ma.cabinetdentaire.dto.UserResponse;
import ma.cabinetdentaire.entity.User;
public final class UserMapper {
    private UserMapper() {}
    public static UserResponse toResponse(User entity) { return UserResponse.from(entity); }
    public static AuthResponse.UserSummary toSummary(User entity) { return AuthResponse.UserSummary.from(entity); }
}
