INSERT INTO settings (setting_key, setting_value, value_type, sensitive)
VALUES
    ('gsm.enabled', 'false', 'BOOLEAN', FALSE),
    ('gsm.port', '', 'STRING', FALSE),
    ('gsm.baud', '115200', 'INTEGER', FALSE),
    ('sms.template.creation', 'Bonjour {patient}, votre rendez-vous est prevu le {date} a {heure}. DENTAL SABRI.', 'STRING', FALSE),
    ('sms.template.modification', 'Bonjour {patient}, votre rendez-vous est modifie au {date} a {heure}. DENTAL SABRI.', 'STRING', FALSE),
    ('sms.template.cancellation', 'Bonjour {patient}, votre rendez-vous du {date} a {heure} est annule. DENTAL SABRI.', 'STRING', FALSE)
ON CONFLICT (setting_key)
DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    value_type = EXCLUDED.value_type,
    sensitive = EXCLUDED.sensitive,
    updated_at = CURRENT_TIMESTAMP;
