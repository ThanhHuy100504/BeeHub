/**
 * Run ALL pending migrations, standalone SQL, and seeds.
 * Each file runs in its OWN connection so a failure in one does NOT
 * cascade ("aborted transaction") to the rest.
 *
 * For migrations that already exist (CREATE TYPE … already exists, etc.)
 * the error is logged but the script continues.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌ DATABASE_URL missing in .env');
  process.exit(1);
}

async function runSQL(label, sql) {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`   ✅ ${label}`);
    return true;
  } catch (err) {
    // "already exists" errors are safe to skip
    if (err.message.includes('already exists')) {
      console.log(`   ⏭️  ${label} (đã tồn tại – bỏ qua)`);
      return true;
    }
    console.error(`   ❌ ${label}: ${err.message}`);
    return false;
  } finally {
    await client.end();
  }
}

async function runFile(rel) {
  const file = path.resolve(__dirname, '..', rel);
  if (!fs.existsSync(file)) {
    console.log(`   ⏭️  Bỏ qua (không tìm thấy): ${rel}`);
    return true;
  }
  const sql = fs.readFileSync(file, 'utf8');
  return runSQL(rel, sql);
}

// ── Migration files (ordered) ───────────────────────────────────────────
const MIGRATIONS = [
  'supabase/migrations/20240101000000_initial_schema.sql',
  'supabase/migrations/20240102000000_orders_and_bookings.sql',
  'supabase/migrations/20240103000000_payments.sql',
  'supabase/migrations/20240104000000_tracking_and_location.sql',
  'supabase/migrations/20240105000000_chat_and_notifications.sql',
  'supabase/migrations/20240106000000_reviews_and_ratings.sql',
  'supabase/migrations/20240107000000_rls_policies.sql',
  'supabase/migrations/20240108000000_seed_data.sql',
  'supabase/migrations/20240109000000_fixes_and_optimizations.sql',
  'supabase/migrations/20240110000000_business_flow_optimizations.sql',
  'supabase/migrations/20240111000000_mvp_cleanup.sql',
  'supabase/migrations/20240113000000_node_auth.sql',
  'supabase/migrations/20240114000000_avatars_storage.sql',
  'supabase/migrations/20240120000000_marketplace_listings.sql',
  'supabase/migrations/20240122000000_marketplace_chat.sql',
  'supabase/migrations/20240123000000_marketplace_deal.sql',
  'supabase/migrations/20240124000000_marketplace_usage_duration.sql',
  'supabase/migrations/20240125000000_marketplace_images_storage.sql',
  'supabase/migrations/20240125000000_marketplace_notifications.sql',
  'supabase/migrations/20240126000000_marketplace_bump_rating.sql',
  'supabase/migrations/20240127000000_customer_booking_locations.sql',
  'supabase/migrations/20240127000000_delivery_photo.sql',
  'supabase/migrations/20240128000000_customer_saved_recent_places.sql',
  'supabase/migrations/20240129000000_order_quotes_bidding.sql',
  'supabase/migrations/20240130000000_fix_deposit_payment_trigger.sql',
  'supabase/migrations/20240131000000_marketplace_listing_fee_payments.sql',
  'supabase/migrations/20240131500000_customer_and_provider_profiles.sql',
  'supabase/migrations/20240132000000_provider_compliance_score.sql',
  'supabase/migrations/20240133000000_orders_dorm_image_urls.sql',
  'supabase/migrations/20240201000000_sync_provider_rating_on_review.sql',
  'supabase/migrations/20240202000000_provider_slot_lock.sql',
  'supabase/migrations/20240203000000_marketplace_listing_deleted_notification.sql',
  'supabase/migrations/20240204000000_chat_attachments.sql',
];

const STANDALONE_SQL = [
  'supabase/admin_dashboard_indexes.sql',
  'supabase/fix-deposit-payment-manual.sql',
  'supabase/manual_fix_step5_auth_trigger.sql',
];

const SEEDS = [
  'supabase/seed-e2e-test-accounts.sql',
  'supabase/seed-demo-orders-ui.sql',
  'supabase/seed-demo-reviews.sql',
];

async function main() {
  let ok = 0, skip = 0, fail = 0;

  // ── 1. Migrations ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('📦 PHẦN 1: Chạy migrations…');
  console.log('═══════════════════════════════════════\n');
  for (const rel of MIGRATIONS) {
    await runFile(rel);
  }

  // ── 2. Standalone SQL ────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('🔧 PHẦN 2: Chạy SQL bổ sung (indexes, fixes)…');
  console.log('═══════════════════════════════════════\n');
  for (const rel of STANDALONE_SQL) {
    await runFile(rel);
  }

  // ── 3. Cleanup FK-blocking data before seeds ─────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('🧹 PHẦN 3: Dọn dẹp dữ liệu demo cũ (FK-safe order)…');
  console.log('═══════════════════════════════════════\n');

  const cleanupSQL = `
    -- Xóa payments liên quan đến DEMO orders
    DELETE FROM payments
    WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

    -- Xóa order tracking
    DELETE FROM order_tracking
    WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

    -- Xóa reviews liên quan đến DEMO orders
    DELETE FROM reviews
    WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

    -- Xóa order_quotes
    DELETE FROM order_quotes
    WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'DEMO-%');

    -- Xóa DEMO orders
    DELETE FROM orders WHERE order_number LIKE 'DEMO-%';

    -- Xóa demo reviews (by known IDs)
    DELETE FROM reviews WHERE id IN (
      SELECT id FROM reviews WHERE reviewer_id IN (
        'c3000001-0001-4001-8001-000000000001'::uuid,
        'c3000001-0001-4001-8001-000000000002'::uuid,
        'c3000001-0001-4001-8001-000000000003'::uuid
      )
    );
  `;
  await runSQL('Cleanup demo data', cleanupSQL);

  // ── 4. Seeds (each in own connection) ────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('🌱 PHẦN 4: Chạy seed dữ liệu mẫu…');
  console.log('═══════════════════════════════════════\n');
  for (const rel of SEEDS) {
    await runFile(rel);
  }

  // ── Done ─────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('🏁 Hoàn tất! Database đã được cập nhật đầy đủ.');
  console.log('════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('💥 Lỗi:', err.message);
  process.exit(1);
});
