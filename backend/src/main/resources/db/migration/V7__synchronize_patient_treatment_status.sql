WITH latest_consultation AS (
    SELECT DISTINCT ON (patient_id)
           patient_id,
           treatment_status,
           consultation_at
    FROM consultations
    WHERE deleted_at IS NULL
    ORDER BY patient_id, consultation_at DESC
)
UPDATE patients patient
SET file_status = CASE
        WHEN latest.treatment_status = 'TERMINE' THEN 'TRAITEMENT_TERMINE'
        ELSE 'EN_COURS'
    END,
    last_visit_at = latest.consultation_at
FROM latest_consultation latest
WHERE patient.id = latest.patient_id
  AND patient.deleted_at IS NULL;
