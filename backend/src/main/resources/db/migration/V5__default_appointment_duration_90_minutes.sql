INSERT INTO settings (setting_key, setting_value, value_type, sensitive)
VALUES ('appointment.defaultDuration', '90', 'INTEGER', FALSE)
ON CONFLICT (setting_key)
DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    value_type = EXCLUDED.value_type,
    sensitive = EXCLUDED.sensitive,
    updated_at = CURRENT_TIMESTAMP;
