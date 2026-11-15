-- Fix: invalid input syntax for type numeric: ""0.1"" in calculate_order_deposit()
-- When deposit_rate in platform_settings is stored as a JSON string or contains quotes,
-- (value::text)::DECIMAL fails in Postgres.
-- This migration safely extracts the value as unquoted text and adds exception handling.

CREATE OR REPLACE FUNCTION calculate_order_deposit()
RETURNS TRIGGER AS $$
DECLARE
    v_deposit_rate DECIMAL(5,2);
    v_raw_val TEXT;
BEGIN
    -- Trích xuất giá trị unquoted từ JSONB, loại bỏ dấu ngoặc kép thừa
    SELECT TRIM(BOTH '"' FROM COALESCE(value #>> '{}', value::text))
    INTO v_raw_val
    FROM platform_settings WHERE key = 'deposit_rate';

    BEGIN
        v_deposit_rate := v_raw_val::DECIMAL;
    EXCEPTION WHEN OTHERS THEN
        v_deposit_rate := 0.30;
    END;

    IF v_deposit_rate IS NULL THEN
        v_deposit_rate := 0.30;
    END IF;

    IF NEW.deposit_amount = 0 OR NEW.deposit_amount IS NULL THEN
        NEW.deposit_amount := ROUND(NEW.total_price * v_deposit_rate, 0);
    END IF;

    NEW.remaining_amount := NEW.total_price - NEW.deposit_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Chuẩn hóa dữ liệu hiện có trong platform_settings nếu đang lưu dạng chuỗi JSON có ngoặc kép
UPDATE platform_settings
SET value = to_jsonb(TRIM(BOTH '"' FROM value::text)::numeric)
WHERE key IN (
    'deposit_rate',
    'commission_rate',
    'shared_move_discount_rate',
    'cancel_before_accept_refund_rate',
    'cancel_after_accept_refund_rate',
    'min_deposit_amount',
    'referral_reward_amount'
)
AND jsonb_typeof(value) = 'string'
AND TRIM(BOTH '"' FROM value::text) ~ '^[0-9]+(\.[0-9]+)?$';

