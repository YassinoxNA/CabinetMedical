UPDATE settings
SET setting_value = '60',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'appointment.defaultDuration'
  AND CAST(setting_value AS INTEGER) > 60;
