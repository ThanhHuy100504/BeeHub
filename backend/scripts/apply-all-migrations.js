/**
 * Apply all SQL migrations in backend/supabase/migrations in sequence
 * using DIRECT_DATABASE_URL or DATABASE_URL.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DIRECT_DATABASE_URL or DATABASE_URL missing in .env');
    process.exit(1);
  }

  // Remove pgbouncer query param if present for migration runner
  const cleanUrl = dbUrl.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');
  console.log('Connecting to database...');

  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Connected successfully to PostgreSQL');

  try {
    // 1. Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read all migration files
    const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files in ${migrationsDir}`);

    // 3. Get applied migrations
    const res = await client.query('SELECT version FROM _schema_migrations');
    const applied = new Set(res.rows.map(r => r.version));

    // 4. Apply each pending migration
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭️  Skipping already applied: ${file}`);
        continue;
      }

      console.log(`\n▶️  Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const startTime = Date.now();
      try {
        await client.query(sql);
        await client.query('INSERT INTO _schema_migrations (version) VALUES ($1)', [file]);
        console.log(`✅ Applied ${file} (${Date.now() - startTime}ms)`);
      } catch (err) {
        console.error(`❌ FAILED on ${file}:`, err.message);
        throw err;
      }
    }

    console.log('\n🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY!');

    // Show summary of created tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`\n📊 Public schema now has ${tableRes.rows.length} tables:`);
    console.log(tableRes.rows.map(r => r.table_name).join(', '));

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Migration process aborted:', err.message);
  process.exit(1);
});
