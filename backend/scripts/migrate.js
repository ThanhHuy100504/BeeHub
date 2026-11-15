const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

let env;
try {
  env = require('./src/config/env');
} catch (e) {
  env = require('../src/config/env');
}

async function run() {
  const sqlFile = process.argv[2] || path.join(__dirname, '../supabase/migrations/20261110000000_shared_moving_enhancement.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  const connectionString = (env.DATABASE_URL || '').replace('?pgbouncer=true', '');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database...');
    await client.query(sql);
    console.log('Migration successfully applied:', path.basename(sqlFile));
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

