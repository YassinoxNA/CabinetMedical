package ma.cabinetdentaire.dto;

import java.util.List;

public record DuplicatePatientResponse(
        boolean possibleDuplicate,
        String message,
        List<PatientResponse> matches
) {
}
