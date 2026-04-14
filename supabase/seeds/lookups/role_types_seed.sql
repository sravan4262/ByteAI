-- ============================================================
-- SEED DATA: lookups.role_types
-- ============================================================
INSERT INTO lookups.role_types (name, label, description) VALUES
('user', 'Standard User', 'Default platform access assigned upon user registration.'),
('admin', 'Administrator', 'Has complete system access including the admin dashboard and feature flags panel.')
ON CONFLICT (name) DO UPDATE SET
label = EXCLUDED.label,
description = EXCLUDED.description;
