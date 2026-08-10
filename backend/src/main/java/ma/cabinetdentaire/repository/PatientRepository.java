package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {

    interface EligibleLaboratoryTreatment {
        UUID getPatientId();
        String getPatientNumber();
        String getFirstName();
        String getLastName();
        String getCin();
        String getPrimaryPhone();
        String getTreatmentType();
    }

    Optional<Patient> findByIdAndDeletedAtIsNull(UUID id);
    Optional<Patient> findByCinIgnoreCaseAndDeletedAtIsNull(String cin);
    List<Patient> findTop10ByPrimaryPhoneAndDeletedAtIsNull(String phone);
    List<Patient> findTop10ByFirstNameIgnoreCaseAndLastNameIgnoreCaseAndBirthDateAndDeletedAtIsNull(
            String firstName, String lastName, LocalDate birthDate);

    @Query("""
            select p from Patient p
            where p.deletedAt is null and p.archivedAt is null and (
                lower(p.firstName) like lower(concat('%', :q, '%'))
                or lower(p.lastName) like lower(concat('%', :q, '%'))
                or lower(concat(p.firstName, ' ', p.lastName)) like lower(concat('%', :q, '%'))
                or p.primaryPhone like concat('%', :q, '%')
                or lower(p.cin) like lower(concat('%', :q, '%'))
                or lower(p.patientNumber) like lower(concat('%', :q, '%'))
            )
            """)
    Page<Patient> search(@Param("q") String query, Pageable pageable);

    Page<Patient> findAllByDeletedAtIsNullAndArchivedAtIsNull(Pageable pageable);
    long countByDeletedAtIsNull();

    @Query("""
            select distinct p from Patient p
            where p.deletedAt is null and p.archivedAt is null and (
                exists (
                    select c.id from Consultation c
                    where c.patient = p and c.deletedAt is null and (
                        lower(coalesce(c.diseaseType, '')) like '%couronne%'
                        or lower(coalesce(c.reason, '')) like '%couronne%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%couronne%'
                        or lower(coalesce(c.diseaseType, '')) like '%bridge%'
                        or lower(coalesce(c.reason, '')) like '%bridge%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%bridge%'
                        or lower(coalesce(c.diseaseType, '')) like '%prothèse%'
                        or lower(coalesce(c.diseaseType, '')) like '%prothese%'
                        or lower(coalesce(c.reason, '')) like '%prothèse%'
                        or lower(coalesce(c.reason, '')) like '%prothese%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%prothèse%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%prothese%'
                        or lower(coalesce(c.diseaseType, '')) like '%facette%'
                        or lower(coalesce(c.reason, '')) like '%facette%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%facette%'
                        or lower(coalesce(c.diseaseType, '')) like '%inlay%'
                        or lower(coalesce(c.diseaseType, '')) like '%onlay%'
                        or lower(coalesce(c.reason, '')) like '%inlay%'
                        or lower(coalesce(c.reason, '')) like '%onlay%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%inlay%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%onlay%'
                        or lower(coalesce(c.diseaseType, '')) like '%orthodont%'
                        or lower(coalesce(c.reason, '')) like '%orthodont%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%orthodont%'
                        or lower(coalesce(c.diseaseType, '')) like '%gouttière%'
                        or lower(coalesce(c.diseaseType, '')) like '%gouttiere%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%réparation%proth%'
                        or lower(coalesce(c.treatmentPerformed, '')) like '%reparation%proth%'
                    )
                )
                or exists (
                    select tp.id from TreatmentPlan tp
                    where tp.patient = p and tp.deletedAt is null and tp.status <> ma.cabinetdentaire.entity.TreatmentPlan.Status.ANNULE and (
                        lower(coalesce(tp.title, '')) like '%couronne%'
                        or lower(coalesce(tp.title, '')) like '%bridge%'
                        or lower(coalesce(tp.title, '')) like '%prothèse%'
                        or lower(coalesce(tp.title, '')) like '%prothese%'
                        or lower(coalesce(tp.title, '')) like '%facette%'
                        or lower(coalesce(tp.title, '')) like '%inlay%'
                        or lower(coalesce(tp.title, '')) like '%onlay%'
                        or lower(coalesce(tp.title, '')) like '%orthodont%'
                        or lower(coalesce(tp.title, '')) like '%gouttière%'
                        or lower(coalesce(tp.title, '')) like '%gouttiere%'
                        or lower(coalesce(tp.notes, '')) like '%réparation%proth%'
                        or lower(coalesce(tp.notes, '')) like '%reparation%proth%'
                    )
                )
            )
            order by p.lastName, p.firstName
            """)
    List<Patient> findEligibleForLaboratory();

    @Query(value = """
            select distinct p.*
            from patients p
            where p.deleted_at is null
              and p.archived_at is null
              and (
                exists (
                    select 1 from appointments a
                    where a.patient_id = p.id
                      and a.status <> 'ANNULE'
                      and lower(concat_ws(' ', a.treatment_type, a.reason)) like any (array[
                        '%obturation composite%',
                        '%couronne zircone%',
                        '%couronne céramo-céramique%',
                        '%couronne ceramo-ceramique%'
                      ])
                )
                or exists (
                    select 1 from consultations c
                    where c.patient_id = p.id
                      and c.deleted_at is null
                      and lower(concat_ws(' ', c.disease_type, c.reason, c.treatment_performed)) like any (array[
                        '%obturation composite%',
                        '%couronne zircone%',
                        '%couronne céramo-céramique%',
                        '%couronne ceramo-ceramique%'
                      ])
                )
                or exists (
                    select 1 from treatment_plans tp
                    where tp.patient_id = p.id
                      and tp.deleted_at is null
                      and tp.status <> 'ANNULE'
                      and lower(concat_ws(' ', tp.title, tp.notes)) like any (array[
                        '%obturation composite%',
                        '%couronne zircone%',
                        '%couronne céramo-céramique%',
                        '%couronne ceramo-ceramique%'
                      ])
                )
              )
            order by p.last_name, p.first_name
            """, nativeQuery = true)
    List<Patient> findEligibleForSelectedLaboratoryTreatments();

    @Query(value = """
            select distinct
                p.id as "patientId",
                p.patient_number as "patientNumber",
                p.first_name as "firstName",
                p.last_name as "lastName",
                p.cin as "cin",
                p.primary_phone as "primaryPhone",
                treatment.label as "treatmentType"
            from patients p
            cross join (values
                ('Obturation composite', 'obturation composite', 'obturation composite'),
                ('Couronne zircone', 'couronne zircone', 'couronne zircone'),
                ('Couronne céramo-céramique', 'couronne céramo-céramique', 'couronne ceramo-ceramique')
            ) as treatment(label, accented_name, plain_name)
            where p.deleted_at is null
              and p.archived_at is null
              and (
                exists (
                    select 1 from appointments a
                    where a.patient_id = p.id
                      and a.status not in ('ANNULE', 'ABSENT', 'REPORTE')
                      and (
                        lower(concat_ws(' ', a.treatment_type, a.reason)) like concat('%', treatment.accented_name, '%')
                        or lower(concat_ws(' ', a.treatment_type, a.reason)) like concat('%', treatment.plain_name, '%')
                      )
                )
                or exists (
                    select 1 from consultations c
                    where c.patient_id = p.id
                      and c.deleted_at is null
                      and (
                        lower(concat_ws(' ', c.disease_type, c.reason, c.treatment_performed)) like concat('%', treatment.accented_name, '%')
                        or lower(concat_ws(' ', c.disease_type, c.reason, c.treatment_performed)) like concat('%', treatment.plain_name, '%')
                      )
                )
                or exists (
                    select 1 from treatment_plans tp
                    where tp.patient_id = p.id
                      and tp.deleted_at is null
                      and tp.status <> 'ANNULE'
                      and (
                        lower(concat_ws(' ', tp.title, tp.notes)) like concat('%', treatment.accented_name, '%')
                        or lower(concat_ws(' ', tp.title, tp.notes)) like concat('%', treatment.plain_name, '%')
                      )
                )
              )
            order by p.last_name, p.first_name, treatment.label
            """, nativeQuery = true)
    List<EligibleLaboratoryTreatment> findEligibleLaboratoryTreatments();
}
