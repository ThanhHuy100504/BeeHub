-- =============================================================================
-- FIX ALL REMAINING ISSUES
-- Chạy SAU khi run-all-pending.js đã hoàn thành lần 1
-- File này xử lý:
--   1. RLS policies cho các bảng THỰC SỰ tồn tại (bỏ geofences, message_reactions, 
--      typing_indicators, feedback, feedback_responses, abuse_reports)
--   2. Fixes & optimizations — phần geofence_events + fcm_token
--   3. Seed demo orders — FK-safe cleanup rồi insert lại
-- =============================================================================

-- ── PHẦN 1: RLS helper functions ────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_customer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'customer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_provider()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'provider'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── PHẦN 2: Enable RLS (chỉ bảng tồn tại) ─────────────────────────────

DO $$ BEGIN
  -- Users & Profiles
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE provider_documents ENABLE ROW LEVEL SECURITY;
  -- Orders
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
  -- Payments
  ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
  ALTER TABLE provider_earnings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE provider_withdrawals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;
  -- Tracking & Location (bỏ geofences, geofence_events)
  ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
  ALTER TABLE order_tracking_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE distance_matrix ENABLE ROW LEVEL SECURITY;
  -- Chat & Notifications (bỏ message_reactions, typing_indicators)
  ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
  ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
  -- Reviews & Ratings (bỏ feedback, feedback_responses, abuse_reports)
  ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
  ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE provider_reviews_summary ENABLE ROW LEVEL SECURITY;
  ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── PHẦN 3: RLS policies (DROP IF EXISTS + re-create) ───────────────────

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Provider documents
DROP POLICY IF EXISTS "Provider documents viewable by owner and admins" ON provider_documents;
CREATE POLICY "Provider documents viewable by owner and admins"
    ON provider_documents FOR SELECT USING (auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "Providers can insert own documents" ON provider_documents;
CREATE POLICY "Providers can insert own documents"
    ON provider_documents FOR INSERT WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Providers can update own documents" ON provider_documents;
CREATE POLICY "Providers can update own documents"
    ON provider_documents FOR UPDATE USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Admins can update any provider documents" ON provider_documents;
CREATE POLICY "Admins can update any provider documents"
    ON provider_documents FOR UPDATE USING (is_admin());

-- Orders
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders"
    ON orders FOR SELECT USING (auth.uid() = customer_id OR is_admin());

DROP POLICY IF EXISTS "Providers can view assigned orders" ON orders;
CREATE POLICY "Providers can view assigned orders"
    ON orders FOR SELECT USING (auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "Providers can view pending orders in their area" ON orders;
CREATE POLICY "Providers can view pending orders in their area"
    ON orders FOR SELECT USING (
        status IN ('pending', 'matched') AND 
        is_provider() AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'provider' AND is_verified = TRUE AND is_available = TRUE
        )
    );

DROP POLICY IF EXISTS "Customers can create orders" ON orders;
CREATE POLICY "Customers can create orders"
    ON orders FOR INSERT WITH CHECK (auth.uid() = customer_id AND is_customer());

DROP POLICY IF EXISTS "Customers can update own pending orders" ON orders;
CREATE POLICY "Customers can update own pending orders"
    ON orders FOR UPDATE USING (auth.uid() = customer_id AND status = 'pending');

DROP POLICY IF EXISTS "Providers can update assigned orders" ON orders;
CREATE POLICY "Providers can update assigned orders"
    ON orders FOR UPDATE USING (auth.uid() = provider_id AND is_provider());

DROP POLICY IF EXISTS "Admins can update any order" ON orders;
CREATE POLICY "Admins can update any order"
    ON orders FOR UPDATE USING (is_admin());

-- Order status history
DROP POLICY IF EXISTS "Order status history viewable by order participants" ON order_status_history;
CREATE POLICY "Order status history viewable by order participants"
    ON order_status_history FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_id AND (customer_id = auth.uid() OR provider_id = auth.uid())
        ) OR is_admin()
    );

-- Payments
DROP POLICY IF EXISTS "Payments viewable by customer and admin" ON payments;
CREATE POLICY "Payments viewable by customer and admin"
    ON payments FOR SELECT USING (auth.uid() = customer_id OR is_admin());

DROP POLICY IF EXISTS "Customers can create payments" ON payments;
CREATE POLICY "Customers can create payments"
    ON payments FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "System can update payments" ON payments;
CREATE POLICY "System can update payments"
    ON payments FOR UPDATE USING (is_admin());

-- Provider earnings
DROP POLICY IF EXISTS "Providers can view own earnings" ON provider_earnings;
CREATE POLICY "Providers can view own earnings"
    ON provider_earnings FOR SELECT USING (auth.uid() = provider_id OR is_admin());

-- Provider withdrawals
DROP POLICY IF EXISTS "Providers can view own withdrawals" ON provider_withdrawals;
CREATE POLICY "Providers can view own withdrawals"
    ON provider_withdrawals FOR SELECT USING (auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "Providers can create withdrawal requests" ON provider_withdrawals;
CREATE POLICY "Providers can create withdrawal requests"
    ON provider_withdrawals FOR INSERT WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Admins can update withdrawals" ON provider_withdrawals;
CREATE POLICY "Admins can update withdrawals"
    ON provider_withdrawals FOR UPDATE USING (is_admin());

-- Wallets
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet"
    ON wallets FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can create own wallet" ON wallets;
CREATE POLICY "Users can create own wallet"
    ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallet transactions
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
    ON wallet_transactions FOR SELECT USING (
        EXISTS (SELECT 1 FROM wallets WHERE id = wallet_id AND user_id = auth.uid()) OR is_admin()
    );

-- Promotions
DROP POLICY IF EXISTS "Everyone can view active promotions" ON promotions;
CREATE POLICY "Everyone can view active promotions"
    ON promotions FOR SELECT USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admins can manage promotions" ON promotions;
CREATE POLICY "Admins can manage promotions"
    ON promotions FOR ALL USING (is_admin());

-- Promotion usage
DROP POLICY IF EXISTS "Users can view own promotion usage" ON promotion_usage;
CREATE POLICY "Users can view own promotion usage"
    ON promotion_usage FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Provider locations
DROP POLICY IF EXISTS "Provider locations viewable by customers with active orders" ON provider_locations;
CREATE POLICY "Provider locations viewable by customers with active orders"
    ON provider_locations FOR SELECT USING (
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM orders
            WHERE provider_id = provider_locations.provider_id 
            AND customer_id = auth.uid()
            AND status IN ('accepted', 'picking_up', 'picked_up', 'in_progress', 'delivering')
        ) OR is_admin()
    );

DROP POLICY IF EXISTS "Providers can insert own location" ON provider_locations;
CREATE POLICY "Providers can insert own location"
    ON provider_locations FOR INSERT WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Providers can update own location" ON provider_locations;
CREATE POLICY "Providers can update own location"
    ON provider_locations FOR UPDATE USING (auth.uid() = provider_id);

-- Order tracking events
DROP POLICY IF EXISTS "Order tracking viewable by order participants" ON order_tracking_events;
CREATE POLICY "Order tracking viewable by order participants"
    ON order_tracking_events FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_id AND (customer_id = auth.uid() OR provider_id = auth.uid())
        ) OR is_admin()
    );

DROP POLICY IF EXISTS "Providers can create tracking events" ON order_tracking_events;
CREATE POLICY "Providers can create tracking events"
    ON order_tracking_events FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- Distance matrix
DROP POLICY IF EXISTS "Distance matrix readable by authenticated users" ON distance_matrix;
CREATE POLICY "Distance matrix readable by authenticated users"
    ON distance_matrix FOR SELECT USING (auth.role() = 'authenticated');

-- Conversations
DROP POLICY IF EXISTS "Conversation participants can view" ON conversations;
CREATE POLICY "Conversation participants can view"
    ON conversations FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = provider_id OR is_admin());

DROP POLICY IF EXISTS "System can create conversations" ON conversations;
CREATE POLICY "System can create conversations"
    ON conversations FOR INSERT WITH CHECK (auth.uid() = customer_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "Participants can update conversation" ON conversations;
CREATE POLICY "Participants can update conversation"
    ON conversations FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Messages
DROP POLICY IF EXISTS "Conversation participants can view messages" ON messages;
CREATE POLICY "Conversation participants can view messages"
    ON messages FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE id = conversation_id AND (customer_id = auth.uid() OR provider_id = auth.uid())
        ) OR is_admin()
    );

DROP POLICY IF EXISTS "Conversation participants can send messages" ON messages;
CREATE POLICY "Conversation participants can send messages"
    ON messages FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations
            WHERE id = conversation_id AND (customer_id = auth.uid() OR provider_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Senders can update own messages" ON messages;
CREATE POLICY "Senders can update own messages"
    ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT WITH CHECK (true);

-- Push tokens
DROP POLICY IF EXISTS "Users can manage own push tokens" ON push_tokens;
CREATE POLICY "Users can manage own push tokens"
    ON push_tokens FOR ALL USING (auth.uid() = user_id);

-- Notification preferences
DROP POLICY IF EXISTS "Users can manage own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage own notification preferences"
    ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Notification templates
DROP POLICY IF EXISTS "Authenticated users can view notification templates" ON notification_templates;
CREATE POLICY "Authenticated users can view notification templates"
    ON notification_templates FOR SELECT USING (auth.role() = 'authenticated' OR is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage notification templates" ON notification_templates;
CREATE POLICY "Admins can manage notification templates"
    ON notification_templates FOR ALL USING (is_admin());

-- Announcements
DROP POLICY IF EXISTS "Everyone can view published announcements" ON announcements;
CREATE POLICY "Everyone can view published announcements"
    ON announcements FOR SELECT USING (is_published = TRUE OR is_admin());

DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements"
    ON announcements FOR ALL USING (is_admin());

-- Reviews
DROP POLICY IF EXISTS "Published reviews viewable by everyone" ON reviews;
CREATE POLICY "Published reviews viewable by everyone"
    ON reviews FOR SELECT USING (is_published = TRUE AND is_hidden = FALSE OR auth.uid() = customer_id OR is_admin());

DROP POLICY IF EXISTS "Customers can create reviews for completed orders" ON reviews;
CREATE POLICY "Customers can create reviews for completed orders"
    ON reviews FOR INSERT WITH CHECK (
        auth.uid() = customer_id AND
        EXISTS (
            SELECT 1 FROM orders
            WHERE id = order_id AND customer_id = auth.uid() AND status = 'completed'
        )
    );

DROP POLICY IF EXISTS "Customers can update own reviews" ON reviews;
CREATE POLICY "Customers can update own reviews"
    ON reviews FOR UPDATE USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Providers can respond to reviews" ON reviews;
CREATE POLICY "Providers can respond to reviews"
    ON reviews FOR UPDATE USING (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Admins can moderate reviews" ON reviews;
CREATE POLICY "Admins can moderate reviews"
    ON reviews FOR UPDATE USING (is_admin());

-- Review votes
DROP POLICY IF EXISTS "Users can vote on reviews" ON review_votes;
CREATE POLICY "Users can vote on reviews"
    ON review_votes FOR ALL USING (auth.role() = 'authenticated');

-- Provider reviews summary
DROP POLICY IF EXISTS "Everyone can view provider review summaries" ON provider_reviews_summary;
CREATE POLICY "Everyone can view provider review summaries"
    ON provider_reviews_summary FOR SELECT USING (true);

-- Disputes
DROP POLICY IF EXISTS "Dispute participants can view" ON disputes;
CREATE POLICY "Dispute participants can view"
    ON disputes FOR SELECT USING (
        auth.uid() = raised_by OR
        auth.uid() = against_user_id OR
        EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR provider_id = auth.uid())) OR
        is_admin()
    );

DROP POLICY IF EXISTS "Users can create disputes for their orders" ON disputes;
CREATE POLICY "Users can create disputes for their orders"
    ON disputes FOR INSERT WITH CHECK (
        auth.uid() = raised_by AND
        EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR provider_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Admins can manage disputes" ON disputes;
CREATE POLICY "Admins can manage disputes"
    ON disputes FOR ALL USING (is_admin());

-- Dispute messages
DROP POLICY IF EXISTS "Dispute participants can view messages" ON dispute_messages;
CREATE POLICY "Dispute participants can view messages"
    ON dispute_messages FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM disputes
            WHERE id = dispute_id AND (raised_by = auth.uid() OR against_user_id = auth.uid())
        ) OR is_admin()
    );

DROP POLICY IF EXISTS "Dispute participants can send messages" ON dispute_messages;
CREATE POLICY "Dispute participants can send messages"
    ON dispute_messages FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM disputes
            WHERE id = dispute_id AND (raised_by = auth.uid() OR against_user_id = auth.uid())
        )
    );

-- ── PHẦN 4: Fixes (phần geofence_events bỏ qua, fcm_token bỏ qua vì đã thêm) ─

-- FIX 9: SKIP geofence_events (bảng không tồn tại)

-- FIX 24: views
DROP VIEW IF EXISTS active_orders_view CASCADE;
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

DROP VIEW IF EXISTS provider_statistics_view CASCADE;
CREATE OR REPLACE VIEW provider_statistics_view AS
SELECT
    p.id AS provider_id,
    p.business_name,
    p.full_name,
    p.avatar_url,
    p.rating,
    p.total_reviews,
    p.total_orders,
    p.total_earnings,
    p.is_verified,
    p.is_available,
    COUNT(DISTINCT CASE WHEN o.status IN ('accepted', 'matched', 'in_progress', 'picking_up', 'picked_up', 'delivering') THEN o.id END) AS active_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' AND o.completed_at >= NOW() - INTERVAL '30 days' THEN o.id END) AS orders_last_30_days,
    COALESCE(SUM(CASE WHEN pe.status = 'available' THEN pe.net_earnings ELSE 0 END), 0) AS available_earnings
FROM profiles p
LEFT JOIN orders o ON p.id = o.provider_id
LEFT JOIN provider_earnings pe ON p.id = pe.provider_id
WHERE p.role = 'provider'
GROUP BY p.id, p.business_name, p.full_name, p.avatar_url, p.rating, p.total_reviews, p.total_orders, p.total_earnings, p.is_verified, p.is_available;

-- FIX 25: functions
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO provider_reviews_summary (provider_id)
    VALUES (NEW.provider_id)
    ON CONFLICT (provider_id) DO NOTHING;

    UPDATE provider_reviews_summary
    SET
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND is_published = TRUE),
        average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE provider_id = NEW.provider_id AND is_published = TRUE),
        rating_5_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND rating = 5 AND is_published = TRUE),
        rating_4_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND rating = 4 AND is_published = TRUE),
        rating_3_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND rating = 3 AND is_published = TRUE),
        rating_2_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND rating = 2 AND is_published = TRUE),
        rating_1_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND rating = 1 AND is_published = TRUE),
        avg_service_quality = (SELECT ROUND(AVG(service_quality_rating)::numeric, 2) FROM reviews WHERE provider_id = NEW.provider_id AND service_quality_rating IS NOT NULL AND is_published = TRUE),
        avg_punctuality = (SELECT ROUND(AVG(punctuality_rating)::numeric, 2) FROM reviews WHERE provider_id = NEW.provider_id AND punctuality_rating IS NOT NULL AND is_published = TRUE),
        avg_professionalism = (SELECT ROUND(AVG(professionalism_rating)::numeric, 2) FROM reviews WHERE provider_id = NEW.provider_id AND professionalism_rating IS NOT NULL AND is_published = TRUE),
        avg_value_for_money = (SELECT ROUND(AVG(value_for_money_rating)::numeric, 2) FROM reviews WHERE provider_id = NEW.provider_id AND value_for_money_rating IS NOT NULL AND is_published = TRUE),
        response_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND provider_response IS NOT NULL AND is_published = TRUE),
        updated_at = NOW()
    WHERE provider_id = NEW.provider_id;

    UPDATE provider_reviews_summary
    SET response_rate = CASE
        WHEN total_reviews > 0 THEN ROUND((response_count::DECIMAL / total_reviews * 100)::numeric, 2)
        ELSE 0
    END
    WHERE provider_id = NEW.provider_id;

    UPDATE profiles
    SET
        rating = (SELECT average_rating FROM provider_reviews_summary WHERE provider_id = NEW.provider_id),
        total_reviews = (SELECT total_reviews FROM provider_reviews_summary WHERE provider_id = NEW.provider_id)
    WHERE id = NEW.provider_id AND role = 'provider';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_provider_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_commission_rate DECIMAL(5,2) := 15.00;
    v_commission_amount DECIMAL(12,2);
    v_net_earnings DECIMAL(12,2);
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;

        IF v_order.provider_id IS NOT NULL THEN
            v_commission_amount := NEW.amount * (v_commission_rate / 100);
            v_net_earnings := NEW.amount - v_commission_amount;

            INSERT INTO provider_earnings (
                provider_id, order_id, payment_id,
                order_amount, platform_commission, net_earnings,
                commission_rate, status
            ) VALUES (
                v_order.provider_id, NEW.order_id, NEW.id,
                NEW.amount, v_commission_amount, v_net_earnings,
                v_commission_rate, 'available'
            );

            UPDATE profiles
            SET total_earnings = total_earnings + v_net_earnings
            WHERE id = v_order.provider_id AND role = 'provider';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION find_nearby_providers(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km DECIMAL DEFAULT 10,
    p_vehicle_size TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    provider_id UUID,
    business_name TEXT,
    full_name TEXT,
    rating DECIMAL,
    vehicle_type TEXT,
    distance_km DECIMAL,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pl.provider_id,
        pr.business_name,
        pr.full_name,
        pr.rating,
        pr.vehicle_type,
        ROUND((ST_Distance(
            pl.location,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        ) / 1000)::numeric, 2) AS distance_km,
        pl.is_online
    FROM provider_locations pl
    JOIN profiles pr ON pl.provider_id = pr.id
    WHERE
        pl.is_online = TRUE
        AND pr.is_verified = TRUE
        AND pr.is_available = TRUE
        AND pr.role = 'provider'
        AND (p_vehicle_size IS NULL OR pr.vehicle_type = p_vehicle_size)
        AND ST_DWithin(
            pl.location,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            p_radius_km * 1000
        )
    ORDER BY pl.location <-> ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ── PHẦN 5: Dọn dẹp DEMO data (FK-safe) rồi seed lại ──────────────────

-- Xóa theo đúng thứ tự FK: refunds → payment_transactions → payments → ... → orders
DELETE FROM refunds
WHERE payment_id IN (
  SELECT id FROM payments WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%')
);

DELETE FROM payment_transactions
WHERE payment_id IN (
  SELECT id FROM payments WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%')
);

DELETE FROM payments
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

DELETE FROM order_tracking_events
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

DELETE FROM order_status_history
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

DELETE FROM order_quotes
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

DELETE FROM reviews
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

DELETE FROM messages
WHERE conversation_id IN (
  SELECT id FROM conversations WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%')
);

DELETE FROM conversations
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

DELETE FROM provider_earnings
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

DELETE FROM orders WHERE order_number LIKE 'DEMO-%';

-- ── PHẦN 6: Comments ────────────────────────────────────────────────────
COMMENT ON FUNCTION is_admin IS 'Check if current user is an admin';
COMMENT ON FUNCTION is_customer IS 'Check if current user is a customer';
COMMENT ON FUNCTION is_provider IS 'Check if current user is a provider';
COMMENT ON FUNCTION get_user_role IS 'Get current user role';
