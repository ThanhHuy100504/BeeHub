-- BeeHub MVP Cleanup — for fresh installs after all migrations
-- Mirrors manual_fix_step4_optimize_mvp.sql
-- Note: wallets & wallet_transactions are KEPT (not dropped) for payment processing

DROP VIEW IF EXISTS active_orders_view CASCADE;

ALTER TABLE orders DROP COLUMN IF EXISTS items CASCADE;
ALTER TABLE orders DROP COLUMN IF EXISTS images CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS fcm_token CASCADE;

CREATE OR REPLACE VIEW active_orders_view AS
SELECT
    o.*,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    c.avatar_url AS customer_avatar,
    p.business_name AS provider_name,
    p.vehicle_type,
    p.vehicle_plate,
    p.full_name AS provider_contact_name,
    p.phone AS provider_phone,
    p.avatar_url AS provider_avatar
FROM orders o
LEFT JOIN profiles c ON o.customer_id = c.id
LEFT JOIN profiles p ON o.provider_id = p.id
WHERE o.status NOT IN ('completed', 'cancelled');

DROP TABLE IF EXISTS provider_bids CASCADE;
DROP TABLE IF EXISTS geofence_events CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS feedback_responses CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS abuse_reports CASCADE;
