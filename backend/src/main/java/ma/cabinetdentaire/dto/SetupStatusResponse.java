package ma.cabinetdentaire.dto;

public record SetupStatusResponse(boolean setupRequired, String installationId, long installedAt, long patientCount) {
}
