/**
 * Verify all tables exist and have expected row counts.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const tables = [
    'profiles', 'provider_documents', 'orders', 'order_status_history',
    'payments', 'payment_transactions', 'refunds', 'provider_earnings',
    'provider_withdrawals', 'wallets', 'wallet_transactions',
    'promotions', 'promotion_usage', 'provider_locations', 'location_history',
    'order_tracking_events', 'routes', 'distance_matrix',
    'conversations', 'messages', 'notification_templates', 'notifications',
    'push_tokens', 'notification_preferences', 'announcements',
    'reviews', 'review_votes', 'provider_reviews_summary',
    'disputes', 'dispute_messages',
    'user_credentials', 'marketplace_listings', 'marketplace_conversations',
    'marketplace_messages', 'order_quotes', 'customer_profiles', 'provider_profiles',
  ];

  console.log('\n📋 KIỂM TRA DATABASE BEEHUB\n');
  console.log('Bảng'.padEnd(40) + 'Số dòng'.padStart(10));
  console.log('─'.repeat(50));

  let ok = 0;
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) AS c FROM "${t}"`);
      const count = res.rows[0].c;
      console.log(`✅ ${t.padEnd(38)} ${String(count).padStart(10)}`);
      ok++;
    } catch (err) {
      console.log(`❌ ${t.padEnd(38)} (không tồn tại)`);
    }
  }

  // Check views
  const views = ['active_orders_view', 'provider_statistics_view'];
  console.log('\n📊 VIEWS:');
  for (const v of views) {
    try {
      await client.query(`SELECT 1 FROM "${v}" LIMIT 1`);
      console.log(`✅ ${v}`);
    } catch {
      console.log(`❌ ${v}`);
    }
  }

  // Check functions
  console.log('\n⚙️  FUNCTIONS:');
  const funcs = ['is_admin', 'is_customer', 'is_provider', 'get_user_role',
    'update_provider_rating', 'create_provider_earnings', 'find_nearby_providers'];
  for (const f of funcs) {
    try {
      const res = await client.query(
        `SELECT proname FROM pg_proc WHERE proname = $1`, [f]
      );
      console.log(res.rows.length > 0 ? `✅ ${f}()` : `❌ ${f}()`);
    } catch {
      console.log(`❌ ${f}()`);
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ ${ok}/${tables.length} bảng tồn tại.`);
  console.log(`═══════════════════════════════════════\n`);

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
