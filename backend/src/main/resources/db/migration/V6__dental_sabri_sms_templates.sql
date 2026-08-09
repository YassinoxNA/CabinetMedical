INSERT INTO settings (setting_key, setting_value, value_type, sensitive)
VALUES
    (
        'sms.template.creation',
        'Bonjour {patient}, votre rendez-vous est prévu le {date} à {heure}. DENTAL SABRI.',
        'STRING',
        FALSE
    ),
    (
        'sms.template.cancellation',
        'Bonjour {patient}, votre rendez-vous du {date} à {heure} est annulé. DENTAL SABRI.',
        'STRING',
        FALSE
    )
ON CONFLICT (setting_key)
DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    value_type = EXCLUDED.value_type,
    sensitive = EXCLUDED.sensitive,
    updated_at = CURRENT_TIMESTAMP;
