package ma.cabinetdentaire.repository;

import ma.cabinetdentaire.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    @Query("""
            select (count(a) > 0) from Appointment a
            where a.patient.id = :patientId
              and a.patient.deletedAt is null
              and a.patient.archivedAt is null
              and a.status not in (ma.cabinetdentaire.entity.AppointmentStatus.ANNULE,
                                   ma.cabinetdentaire.entity.AppointmentStatus.ABSENT,
                                   ma.cabinetdentaire.entity.AppointmentStatus.REPORTE)
            """)
    boolean existsUsableAppointmentForPatient(@Param("patientId") UUID patientId);

    @Query("""
            select (count(a) > 0) from Appointment a
            where a.patient.id = :patientId
              and a.patient.deletedAt is null
              and a.patient.archivedAt is null
              and a.startsAt > :after
              and a.status in (ma.cabinetdentaire.entity.AppointmentStatus.PLANIFIE,
                               ma.cabinetdentaire.entity.AppointmentStatus.CONFIRME,
                               ma.cabinetdentaire.entity.AppointmentStatus.PATIENT_ARRIVE,
                               ma.cabinetdentaire.entity.AppointmentStatus.EN_CONSULTATION)
            """)
    boolean existsNewAppointmentAfter(@Param("patientId") UUID patientId, @Param("after") Instant after);

    @Query("""
            select a from Appointment a
            where a.startsAt < :end and a.endsAt > :start
              and a.patient.deletedAt is null
              and a.patient.archivedAt is null
              and a.status not in (ma.cabinetdentaire.entity.AppointmentStatus.ANNULE,
                                   ma.cabinetdentaire.entity.AppointmentStatus.ABSENT,
                                   ma.cabinetdentaire.entity.AppointmentStatus.REPORTE)
            """)
    List<Appointment> findConflicts(@Param("start") Instant start, @Param("end") Instant end);

    @Query("""
            select a from Appointment a
            where a.startsAt < :end and a.endsAt > :start
              and a.patient.deletedAt is null
              and a.patient.archivedAt is null
              and a.status not in (ma.cabinetdentaire.entity.AppointmentStatus.ANNULE,
                                   ma.cabinetdentaire.entity.AppointmentStatus.ABSENT,
                                   ma.cabinetdentaire.entity.AppointmentStatus.REPORTE)
              and a.id <> :excludedId
            """)
    List<Appointment> findConflictsExcluding(@Param("start") Instant start, @Param("end") Instant end,
                                             @Param("excludedId") UUID excludedId);

    @Query("""
            select a from Appointment a
            where a.patient.deletedAt is null
              and a.patient.archivedAt is null
              and a.startsAt >= :from and a.startsAt < :to
            order by a.startsAt
            """)
    List<Appointment> findAllByStartsAtGreaterThanEqualAndStartsAtLessThanOrderByStartsAt(
            @Param("from") Instant from, @Param("to") Instant to);
}
