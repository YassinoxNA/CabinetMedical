INSERT INTO settings (setting_key, setting_value, value_type, sensitive)
VALUES
    ('appointment.defaultDuration', '30', 'INTEGER', FALSE),
    ('appointment.schedule.monday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.tuesday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.wednesday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.thursday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.friday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.saturday', '09:00-13:00', 'STRING', FALSE),
    ('appointment.schedule.sunday', '', 'STRING', FALSE)
ON CONFLICT (setting_key) DO NOTHING;
