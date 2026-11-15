-- Migration: 20261110000000_shared_moving_enhancement.sql
-- Description: Comprehensive shared moving (Ghép đơn sinh viên) support

-- 1. Enhance shared_move_groups
ALTER TABLE shared_move_groups 
    ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'small_truck',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS route_summary TEXT,
    ADD COLUMN IF NOT EXISTS group_route JSONB;

-- 2. Enhance orders
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shared_status TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS shared_discount_percent NUMERIC DEFAULT 25.00;

-- 3. Indexes for fast query
CREATE INDEX IF NOT EXISTS idx_shared_move_groups_provider ON shared_move_groups(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_shared ON orders(is_shared);
CREATE INDEX IF NOT EXISTS idx_orders_shared_status ON orders(shared_status);
CREATE INDEX IF NOT EXISTS idx_orders_shared_move_group_id ON orders(shared_move_group_id);

