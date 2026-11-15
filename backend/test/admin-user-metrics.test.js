const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getUserMetrics, summarizeUserMetrics } = require('../src/services/admin-user-metrics.service');
const users = [{ id: 'c', role: 'customer' }, { id: 'p', role: 'provider' }, { id: 'empty', role: 'customer' }];

test('counts all orders, successful charges minus completed refunds, and recognized net earnings', () => {
  const metrics = summarizeUserMetrics(users,
    [{ customer_id: 'c', status: 'completed' }, { customer_id: 'c', status: 'cancelled' }],
    [{ provider_id: 'p' }], [
      { id: 'deposit', customer_id: 'c', amount: '300', status: 'completed', payment_purpose: 'deposit' },
      { id: 'final', customer_id: 'c', amount: '700', status: 'completed', payment_purpose: 'final' },
      { id: 'partial', customer_id: 'c', amount: '200', status: 'partially_refunded' },
      { id: 'full-refund', customer_id: 'c', amount: '400', status: 'refunded' },
      { id: 'pending', customer_id: 'c', amount: '900', status: 'pending' },
      { id: 'failed', customer_id: 'c', amount: '900', status: 'failed' },
      { id: 'refund', customer_id: 'c', amount: '100', status: 'completed', payment_purpose: 'refund' },
    ], [
      { payment_id: 'deposit', refund_amount: '50', status: 'completed' },
      { payment_id: 'partial', refund_amount: '80', status: 'completed' },
      { payment_id: 'partial', refund_amount: '20', status: 'completed' },
      { payment_id: 'final', refund_amount: '700', status: 'pending' },
    ], [
      { provider_id: 'p', net_earnings: '900', status: 'available' },
      { provider_id: 'p', net_earnings: '450', status: 'withdrawn' },
      { provider_id: 'p', net_earnings: '700', status: 'pending' },
    ]);
  assert.deepEqual(metrics.get('c'), { total_orders: 2, total_spent: 1050, total_earnings: 0 });
  assert.deepEqual(metrics.get('p'), { total_orders: 1, total_spent: 0, total_earnings: 1350 });
  assert.deepEqual(metrics.get('empty'), { total_orders: 0, total_spent: 0, total_earnings: 0 });
});

function mockDb(tables, failTable) {
  return { from(table) {
    let rows = tables[table] || [];
    return {
      select() { return this; },
      in(column, values) { rows = rows.filter(r => values.includes(r[column])); return this; },
      order() { return this; },
      async range(start, end) {
        if (table === failTable) return { error: new Error('database unavailable') };
        // Simulate a server row cap smaller than the requested page size.
        return { data: rows.slice(start, Math.min(end + 1, start + 137)), count: rows.length };
      },
    };
  } };
}

test('reads beyond API row limits, isolates users and does not use profile seed counters', async () => {
  const db = mockDb({
    orders: Array.from({ length: 1205 }, (_, id) => ({ id, customer_id: 'c', provider_id: 'p' })),
    payments: Array.from({ length: 1205 }, (_, id) => ({ id, customer_id: 'c', amount: 10, status: 'completed' })),
    refunds: [{ id: 'r', payment_id: 1204, refund_amount: 5, status: 'completed' }],
    provider_earnings: [{ id: 'e', provider_id: 'p', net_earnings: 90, status: 'available' }],
  });
  const result = await getUserMetrics(db, users.map(u => ({ ...u, total_orders: 99999 })));
  assert.equal(result.get('c').total_orders, 1205);
  assert.equal(result.get('p').total_orders, 1205);
  assert.equal(result.get('c').total_spent, 12045);
  assert.equal(result.get('p').total_earnings, 90);
  assert.equal(result.get('empty').total_orders, 0);
});

test('database errors fail explicitly instead of returning zero or stale counters', async () => {
  await assert.rejects(getUserMetrics(mockDb({}, 'orders'), users), /database unavailable/);
});

test('user endpoint parses HTTP pagination strings and limits each page', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const profiles = Array.from({ length: 25 }, (_, i) => ({ id: `u${i}`, role: 'customer' }));
  const orderColumns = [];
  const db = { from() {
    let start = 0, end = profiles.length - 1;
    return {
      select() { return this; }, eq() { return this; }, or() { return this; },
      range(a, b) { start = a; end = b; return this; },
      order(column) { orderColumns.push(column); return this; },
      then(resolve) { return Promise.resolve({ data: profiles.slice(start, end + 1), count: profiles.length }).then(resolve); },
    };
  } };
  const sandbox = { module: { exports: {} }, console, require(name) {
    if (name.endsWith('/supabase.service')) return { supabaseAdmin: db };
    if (name.endsWith('/admin-user-metrics.service')) return {
      getUserMetrics: async (_db, rows) => new Map(rows.map(u => [u.id, { total_orders: 0, total_spent: 0, total_earnings: 0 }])),
    };
    return {};
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/admin.controller.js'), 'utf8'), sandbox);
  let payload;
  await sandbox.module.exports.getUsers({ query: { role: 'customer', page: '2', pageSize: '10' } }, {
    json(data) { payload = data; }, status(code) { assert.equal(code, 200); return this; },
  });
  assert.equal(payload.data.length, 10);
  assert.equal(payload.data[0].id, 'u10');
  assert.equal(payload.data[9].id, 'u19');
  assert.equal(payload.meta.page, 2);
  assert.equal(payload.meta.pageSize, 10);
  assert.equal(payload.meta.pages, 3);
  assert.deepEqual(orderColumns, ['created_at', 'id']);
});
