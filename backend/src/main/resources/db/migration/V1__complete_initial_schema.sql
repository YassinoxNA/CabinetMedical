CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    status VARCHAR(30) NOT NULL CHECK (status IN ('ACTIVE', 'BLOCKED')),
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_users_username_lower ON users (lower(username));
CREATE INDEX idx_users_role_id ON users(role_id);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    workstation VARCHAR(160)
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

CREATE SEQUENCE patient_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_number VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    cin VARCHAR(30),
    primary_phone VARCHAR(30) NOT NULL,
    secondary_phone VARCHAR(30),
    address VARCHAR(255),
    city VARCHAR(100),
    birth_date DATE,
    sex VARCHAR(20),
    email VARCHAR(160),
    coverage_type VARCHAR(30) NOT NULL DEFAULT 'SANS_ASSURANCE',
    membership_number VARCHAR(80),
    allergies TEXT,
    medical_history TEXT,
    observations TEXT,
    file_status VARCHAR(40) NOT NULL DEFAULT 'NOUVEAU',
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    last_visit_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_patients_cin_lower ON patients(lower(cin)) WHERE cin IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_patients_name ON patients(lower(last_name), lower(first_name));
CREATE INDEX idx_patients_phone ON patients(primary_phone);

CREATE TABLE patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    document_type VARCHAR(40) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    secure_path TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE SEQUENCE treatment_plan_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    plan_number VARCHAR(40) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'EN_COURS',
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    start_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_treatment_plans_patient ON treatment_plans(patient_id);

CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    consultation_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    diagnosis TEXT,
    disease_type VARCHAR(120),
    tooth VARCHAR(30),
    treatment_performed TEXT,
    observations TEXT,
    prescription TEXT,
    price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    treatment_status VARCHAR(40) NOT NULL DEFAULT 'EN_COURS',
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_consultations_patient_date ON consultations(patient_id, consultation_at DESC);

CREATE TABLE treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id),
    consultation_id UUID REFERENCES consultations(id),
    treatment_type VARCHAR(120) NOT NULL,
    tooth VARCHAR(30),
    description TEXT,
    planned_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (planned_price >= 0),
    status VARCHAR(40) NOT NULL DEFAULT 'PLANIFIE',
    planned_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    consultation_id UUID REFERENCES consultations(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255) NOT NULL,
    treatment_type VARCHAR(120),
    observations TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'PLANIFIE',
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    sms_requested BOOLEAN NOT NULL DEFAULT TRUE,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0,
    CHECK (ends_at > starts_at)
);
CREATE INDEX idx_appointments_period ON appointments(starts_at, ends_at);
CREATE INDEX idx_appointments_patient ON appointments(patient_id, starts_at DESC);

CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    phone_number VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(30) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    provider_response TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_sms_pending ON sms_messages(status, scheduled_at);

CREATE TABLE document_sequences (
    sequence_type VARCHAR(20) NOT NULL,
    sequence_year INTEGER NOT NULL,
    current_value BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY(sequence_type, sequence_year)
);

CREATE TABLE patient_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    treatment_plan_id UUID REFERENCES treatment_plans(id),
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    invoice_type VARCHAR(20) NOT NULL,
    invoice_date DATE NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'BROUILLON',
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
    notes TEXT,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    validated_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_patient_invoices_patient ON patient_invoices(patient_id, invoice_date DESC);

CREATE TABLE patient_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES patient_invoices(id),
    consultation_id UUID REFERENCES consultations(id),
    description VARCHAR(255) NOT NULL,
    tooth VARCHAR(30),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE patient_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    invoice_id UUID REFERENCES patient_invoices(id),
    receipt_number VARCHAR(40) NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMPTZ NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    reference VARCHAR(100),
    notes TEXT,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_patient_payments_patient ON patient_payments(patient_id, payment_date DESC);

CREATE TABLE laboratories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(180) NOT NULL UNIQUE,
    manager_name VARCHAR(180),
    phone VARCHAR(30),
    email VARCHAR(160),
    address VARCHAR(255),
    city VARCHAR(100),
    tax_identifier VARCHAR(80),
    observations TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE laboratory_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laboratory_id UUID NOT NULL REFERENCES laboratories(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    consultation_id UUID REFERENCES consultations(id),
    job_type VARCHAR(100) NOT NULL,
    tooth VARCHAR(30),
    shade VARCHAR(40),
    description TEXT,
    sent_date DATE,
    expected_date DATE,
    received_date DATE,
    laboratory_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (laboratory_price >= 0),
    status VARCHAR(40) NOT NULL DEFAULT 'A_PREPARER',
    notes TEXT,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laboratory_id UUID NOT NULL REFERENCES laboratories(id),
    invoice_number VARCHAR(80) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining_amount NUMERIC(12,2) NOT NULL CHECK (remaining_amount >= 0),
    status VARCHAR(40) NOT NULL DEFAULT 'NON_PAYEE',
    attachment_path TEXT,
    notes TEXT,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE(laboratory_id, invoice_number)
);

CREATE TABLE supplier_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id),
    laboratory_job_id UUID REFERENCES laboratory_jobs(id),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0)
);

CREATE TABLE supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laboratory_id UUID NOT NULL REFERENCES laboratories(id),
    supplier_invoice_id UUID REFERENCES supplier_invoices(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMPTZ NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    reference VARCHAR(100),
    notes TEXT,
    verification_status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    label VARCHAR(180) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    expense_date TIMESTAMPTZ NOT NULL,
    supplier VARCHAR(180),
    payment_method VARCHAR(30) NOT NULL,
    reference VARCHAR(100),
    attachment_path TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(12,2),
    status VARCHAR(20) NOT NULL DEFAULT 'OUVERTE',
    responsible_user_id UUID NOT NULL REFERENCES users(id),
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uk_cash_sessions_single_open
ON cash_sessions ((status)) WHERE status = 'OUVERTE';

CREATE TABLE change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    modified_by_user_id UUID REFERENCES users(id),
    modified_by_username VARCHAR(80),
    modified_by_role VARCHAR(40),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_change_history_entity ON change_history(entity_type, entity_id, created_at DESC);

CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    patient_id UUID REFERENCES patients(id),
    submitted_by UUID REFERENCES users(id),
    status VARCHAR(40) NOT NULL DEFAULT 'EN_ATTENTE_VERIFICATION',
    doctor_comment TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_verification_pending ON verification_requests(status, created_at);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    username VARCHAR(80),
    user_role VARCHAR(40),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(80) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    patient_id UUID REFERENCES patients(id),
    old_value TEXT,
    new_value TEXT,
    description TEXT NOT NULL,
    workstation VARCHAR(160),
    local_ip VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE settings (
    setting_key VARCHAR(120) PRIMARY KEY,
    setting_value TEXT,
    value_type VARCHAR(30) NOT NULL DEFAULT 'STRING',
    sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    checksum_sha256 VARCHAR(64),
    backup_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    error_message TEXT
);

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_no_mutation
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER trg_change_history_no_mutation
BEFORE UPDATE OR DELETE ON change_history
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

INSERT INTO roles(code, label) VALUES ('DOCTEUR', 'Docteur'), ('ASSISTANTE', 'Assistante');
INSERT INTO expense_categories(code, label) VALUES
('LABORATOIRE','Laboratoire'), ('LOYER','Loyer'), ('SALAIRES','Salaires'),
('MATERIEL','Matériel'), ('PRODUITS_MEDICAUX','Produits médicaux'),
('EAU','Eau'), ('ELECTRICITE','Électricité'), ('INTERNET','Internet'),
('MAINTENANCE','Maintenance'), ('AUTRE','Autre');
