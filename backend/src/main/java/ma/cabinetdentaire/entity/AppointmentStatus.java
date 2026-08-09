package ma.cabinetdentaire.entity;

public enum AppointmentStatus {
    PLANIFIE,
    CONFIRME,
    PATIENT_ARRIVE,
    EN_CONSULTATION,
    TERMINE,
    ANNULE,
    ABSENT,
    REPORTE;

    public boolean isTerminal() {
        return this == TERMINE || this == ANNULE || this == ABSENT || this == REPORTE;
    }
}
