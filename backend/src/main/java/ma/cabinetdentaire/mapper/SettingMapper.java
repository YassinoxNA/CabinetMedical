package ma.cabinetdentaire.mapper;
import ma.cabinetdentaire.dto.SettingResponse;
import ma.cabinetdentaire.entity.Setting;
public final class SettingMapper {
    private SettingMapper() {}
    public static SettingResponse toResponse(Setting entity) {
        return new SettingResponse(entity.getKey(), entity.isSensitive() ? null : entity.getValue(),
                entity.getValueType(), entity.getUpdatedAt());
    }
}
