INSERT INTO settings (setting_key, setting_value, value_type, sensitive, updated_at)
VALUES
    ('cabinet.name', 'DENTAL SABRI', 'STRING', FALSE, CURRENT_TIMESTAMP),
    ('cabinet.doctor', 'Khalid', 'STRING', FALSE, CURRENT_TIMESTAMP),
    ('cabinet.address', 'Aït Berra, Tinghir', 'STRING', FALSE, CURRENT_TIMESTAMP),
    ('cabinet.phone', '06 90 33 70 82', 'STRING', FALSE, CURRENT_TIMESTAMP),
    ('cabinet.email', 'khalidsabri804@gm.com', 'STRING', FALSE, CURRENT_TIMESTAMP),
    ('cabinet.specialty', 'Prothésiste dentaire', 'STRING', FALSE, CURRENT_TIMESTAMP),
    ('cabinet.taxIdentifier', '', 'STRING', FALSE, CURRENT_TIMESTAMP),
    ('cabinet.logo.path', 'classpath:/branding/dental-sabri-logo.png', 'STRING', FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    value_type = EXCLUDED.value_type,
    sensitive = EXCLUDED.sensitive,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = NULL;
