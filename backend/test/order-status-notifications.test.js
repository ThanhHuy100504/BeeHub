const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(status, options = {}) {
  const order = { id: 'order-1', order_number: 'BH-123', customer_id: 'customer-1', provider_id: 'provider-1', status, delivery_photo_url: 'photo.jpg', total_price: 0 };
  const notifications = [];
  const db = { from(table) {
    let update; const filters = [];
    const q = {
      select() { return q; }, eq(k, v) { filters.push([k,v]); return q; },
      update(value) { update = value; return q; }, insert() { return q; },
      single() { return Promise.resolve(result()); }, maybeSingle() { return Promise.resolve(result()); },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
    function result() {
      if (table !== 'orders') return { data: null, error: null };
      if (update) {
        if (options.failUpdate || filters.some(([k,v]) => order[k] !== v)) return { data: null, error: { message: 'Update rejected' } };
        Object.assign(order, update);
      }
      return { data: { ...order }, error: null };
    }
    return q;
  }};
  const sandbox = { module: { exports: {} }, console, require(name) {
    if (name === './supabase.service') return { supabaseAdmin: db };
    if (name === './notification.service') return { createNotification: async (...args) => { notifications.push(args); return { error: null }; } };
    return {};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services/orders.service.js'), 'utf8'), sandbox);
  return { service: sandbox.module.exports, notifications, order };
}

for (const [before, method, after, type] of [
  ['pending', 'acceptOrder', 'accepted', 'order_accepted'],
  ['scheduled', 'startOrder', 'accepted', 'order_accepted'],
  ['accepted', 'startOrder', 'picking_up', 'order_started'],
  ['picking_up', 'startOrder', 'in_progress', 'order_started'],
  ['in_progress', 'completeOrder', 'completed', 'order_completed'],
]) {
  test(`${before} -> ${after} notifies only the owning customer with an order link`, async () => {
    const f = fixture(before);
    await f.service[method]('order-1', 'provider-1');
    assert.equal(f.notifications.length, 1);
    const [recipient, notificationType, title, body, opts] = f.notifications[0];
    assert.equal(recipient, 'customer-1'); assert.equal(notificationType, type);
    assert.ok(title); assert.match(body, /BH-123/);
    assert.equal(opts.actionUrl, '/don-hang/order-1');
    assert.equal(opts.actionData.order_id, 'order-1');
    assert.equal(opts.actionData.status, after);
    assert.equal(opts.actionData.from_status, before);
  });
}
test('rejected update and unauthorized provider do not notify', async () => {
  for (const [f, provider] of [[fixture('accepted', { failUpdate: true }), 'provider-1'], [fixture('accepted'), 'other-provider']]) {
    await assert.rejects(f.service.startOrder('order-1', provider));
    assert.equal(f.notifications.length, 0);
  }
});
test('simultaneous requests for the same transition notify only once', async () => {
  const f = fixture('accepted');
  const results = await Promise.allSettled([f.service.startOrder('order-1', 'provider-1'), f.service.startOrder('order-1', 'provider-1')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.notifications.length, 1);
});
test('completion without a delivery photo does not notify', async () => {
  const f = fixture('in_progress'); f.order.delivery_photo_url = null;
  await assert.rejects(f.service.completeOrder('order-1', 'provider-1'));
  assert.equal(f.notifications.length, 0);
});
