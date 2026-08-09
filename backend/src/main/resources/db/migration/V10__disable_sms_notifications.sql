UPDATE settings
SET setting_value = 'false',
    value_type = 'BOOLEAN',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'gsm.enabled';
