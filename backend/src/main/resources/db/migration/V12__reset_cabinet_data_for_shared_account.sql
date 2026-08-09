-- Réinitialisation explicitement demandée pour livrer une base vide avec un seul compte partagé.
-- Les rôles et les catégories de dépenses de référence sont conservés.
TRUNCATE TABLE users, document_sequences RESTART IDENTITY CASCADE;

INSERT INTO settings (setting_key, setting_value, value_type, sensitive)
VALUES
    ('appointment.defaultDuration', '60', 'INTEGER', FALSE),
    ('appointment.schedule.monday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.tuesday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.wednesday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.thursday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.friday', '09:00-13:00,15:00-18:00', 'STRING', FALSE),
    ('appointment.schedule.saturday', '09:00-13:00', 'STRING', FALSE),
    ('appointment.schedule.sunday', '', 'STRING', FALSE),
    ('cabinet.name', 'DENTAL SABRI', 'STRING', FALSE),
    ('cabinet.doctor', 'Khalid', 'STRING', FALSE),
    ('cabinet.address', 'Aït Berra, Tinghir', 'STRING', FALSE),
    ('cabinet.phone', '06 90 33 70 82', 'STRING', FALSE),
    ('cabinet.email', 'khalidsabri804@gm.com', 'STRING', FALSE),
    ('cabinet.specialty', 'Prothésiste dentaire', 'STRING', FALSE),
    ('cabinet.taxIdentifier', '', 'STRING', FALSE),
    ('cabinet.logo.path', 'classpath:/branding/dental-sabri-logo.png', 'STRING', FALSE),
    ('gsm.enabled', 'false', 'BOOLEAN', FALSE),
    ('gsm.port', '', 'STRING', FALSE),
    ('gsm.baud', '115200', 'INTEGER', FALSE),
    ('sms.template.creation', 'Bonjour {patient}, votre rendez-vous est prevu le {date} a {heure}. DENTAL SABRI.', 'STRING', FALSE),
    ('sms.template.modification', 'Bonjour {patient}, votre rendez-vous est modifie au {date} a {heure}. DENTAL SABRI.', 'STRING', FALSE),
    ('sms.template.cancellation', 'Bonjour {patient}, votre rendez-vous du {date} a {heure} est annule. DENTAL SABRI.', 'STRING', FALSE);
