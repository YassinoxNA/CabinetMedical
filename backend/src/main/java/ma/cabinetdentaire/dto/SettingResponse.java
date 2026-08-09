package ma.cabinetdentaire.dto;
import java.time.Instant;
public record SettingResponse(String key, String value, String valueType, Instant updatedAt) {}
