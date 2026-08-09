package ma.cabinetdentaire.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "patients")
public class Patient extends BaseEntity {

    @Column(name = "patient_number", nullable = false, unique = true, length = 30)
    private String patientNumber;
    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;
    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;
    @Column(length = 30)
    private String cin;
    @Column(name = "primary_phone", nullable = false, length = 30)
    private String primaryPhone;
    @Column(name = "secondary_phone", length = 30)
    private String secondaryPhone;
    private String address;
    @Column(length = 100)
    private String city;
    @Column(name = "birth_date")
    private LocalDate birthDate;
    @Column(length = 20)
    private String sex;
    @Column(length = 160)
    private String email;
    @Enumerated(EnumType.STRING)
    @Column(name = "coverage_type", nullable = false, length = 30)
    private CoverageType coverageType;
    @Column(name = "membership_number", length = 80)
    private String membershipNumber;
    @Column(columnDefinition = "text")
    private String allergies;
    @Column(name = "medical_history", columnDefinition = "text")
    private String medicalHistory;
    @Column(columnDefinition = "text")
    private String observations;
    @Enumerated(EnumType.STRING)
    @Column(name = "file_status", nullable = false, length = 40)
    private PatientFileStatus fileStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 40)
    private VerificationStatus verificationStatus;
    @Column(name = "last_visit_at")
    private Instant lastVisitAt;
    @Column(name = "archived_at")
    private Instant archivedAt;
    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Patient() {
    }

    public Patient(String patientNumber, String firstName, String lastName, String cin,
                   String primaryPhone, LocalDate birthDate, CoverageType coverageType) {
        this.patientNumber = patientNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.cin = blankToNull(cin);
        this.primaryPhone = primaryPhone;
        this.birthDate = birthDate;
        this.coverageType = coverageType;
        this.fileStatus = PatientFileStatus.NOUVEAU;
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }

    public void updateAdministrative(String firstName, String lastName, String cin,
                                     String primaryPhone, String secondaryPhone, String address,
                                     String city, LocalDate birthDate, String sex, String email,
                                     CoverageType coverageType, String membershipNumber,
                                     String allergies, String medicalHistory, String observations) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.cin = blankToNull(cin);
        this.primaryPhone = primaryPhone;
        this.secondaryPhone = blankToNull(secondaryPhone);
        this.address = blankToNull(address);
        this.city = blankToNull(city);
        this.birthDate = birthDate;
        this.sex = blankToNull(sex);
        this.email = blankToNull(email);
        this.coverageType = coverageType;
        this.membershipNumber = blankToNull(membershipNumber);
        this.allergies = blankToNull(allergies);
        this.medicalHistory = blankToNull(medicalHistory);
        this.observations = blankToNull(observations);
        this.verificationStatus = VerificationStatus.EN_ATTENTE_VERIFICATION;
    }

    public void archive(Instant at) {
        this.archivedAt = at;
        this.fileStatus = PatientFileStatus.ARCHIVE;
    }

    public void updateTreatmentStatus(Consultation.Status treatmentStatus, Instant visitAt) {
        this.fileStatus = treatmentStatus == Consultation.Status.TERMINE
                ? PatientFileStatus.TRAITEMENT_TERMINE
                : PatientFileStatus.EN_COURS;
        this.lastVisitAt = visitAt;
    }

    public void startNewTreatmentCycle() {
        if (this.fileStatus == PatientFileStatus.TRAITEMENT_TERMINE) {
            this.fileStatus = PatientFileStatus.NOUVEAU_TRAITEMENT_PLANIFIE;
        }
    }

    public void restoreCompletedTreatmentStatus() {
        if (this.fileStatus == PatientFileStatus.NOUVEAU_TRAITEMENT_PLANIFIE) {
            this.fileStatus = PatientFileStatus.TRAITEMENT_TERMINE;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public String getPatientNumber() { return patientNumber; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getCin() { return cin; }
    public String getPrimaryPhone() { return primaryPhone; }
    public String getSecondaryPhone() { return secondaryPhone; }
    public String getAddress() { return address; }
    public String getCity() { return city; }
    public LocalDate getBirthDate() { return birthDate; }
    public String getSex() { return sex; }
    public String getEmail() { return email; }
    public CoverageType getCoverageType() { return coverageType; }
    public String getMembershipNumber() { return membershipNumber; }
    public String getAllergies() { return allergies; }
    public String getMedicalHistory() { return medicalHistory; }
    public String getObservations() { return observations; }
    public PatientFileStatus getFileStatus() { return fileStatus; }
    public VerificationStatus getVerificationStatus() { return verificationStatus; }
    public Instant getLastVisitAt() { return lastVisitAt; }
    public Instant getArchivedAt() { return archivedAt; }
}
