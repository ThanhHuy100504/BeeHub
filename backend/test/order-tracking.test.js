const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrderTrackingService } = require('../src/services/order-tracking.service');
const id = '11111111-1111-1111-1111-111111111111';
const now = Date.parse('2026-11-02T12:00:00Z');
function fixture(status = 'in_progress') {
  const tables = {
    orders: [{ id, customer_id: 'customer', provider_id: 'provider', status, order_number: 'BH-1' }],
    provider_locations: [], order_status_history: [{ id: 'event', order_id: id, to_status: status, created_at: new Date(now).toISOString() }],
  };
  let broken = false;
  const db = { from(table) {
    let filters = [], limit, sort, change, insert, upsert;
    const q = {
      select() { return q; }, eq(k,v) { filters.push([k,v]); return q; },
      order(k,opts) { sort=[k,opts.ascending]; return q; }, limit(n) { limit=n; return q; },
      upsert(value, options) { assert.equal(options.onConflict, 'provider_id'); upsert = value; return q; },
      update(value) { change=value; return q; }, insert(value) { insert=value; return q; },
      maybeSingle() { return Promise.resolve(run(true)); },
      then(resolve,reject) { return Promise.resolve(run(false)).then(resolve,reject); },
    };
    function run(single) {
      if (broken) return { error: { message:'DB down' }, data:null };
      if (upsert) {
        const existing = tables[table].find(row => row.provider_id === upsert.provider_id);
        if (existing) Object.assign(existing, upsert);
        else tables[table].push(upsert);
        return { error: null };
      }
      if (insert) {
        if (tables[table].some(row => row.provider_id === insert.provider_id)) return { error: { code: '23505' } };
        tables[table].push(insert); return { error:null };
      }
      let rows=tables[table].filter(r => filters.every(([k,v])=>r[k]===v));
      if(change) rows.forEach(r=>Object.assign(r,change));
      if(sort) rows.sort((a,b)=>String(a[sort[0]]).localeCompare(String(b[sort[0]]))*(sort[1]?1:-1));
      if(limit) rows=rows.slice(0,limit);
      return {data:single?(rows[0]||null):rows,error:null};
    }
    return q;
  }};
  return { service:createOrderTrackingService(db,()=>now), tables, breakDb:()=>{broken=true;} };
}
const point = {latitude:16.05,longitude:108.2,accuracy:12,captured_at:new Date(now).toISOString()};
test('assigned provider shares GPS and only the two order participants can read it',async()=>{
 const f=fixture(); await f.service.publish(id,{id:'provider'},point);
 const result=await f.service.read(id,{id:'customer'});
 assert.equal(result.sharing,'live'); assert.equal(result.location.latitude,point.latitude); assert.equal(result.can_share,false);
 assert.equal((await f.service.read(id,{id:'provider'})).can_share,true);
 for(const user of ['stranger','admin']) await assert.rejects(f.service.read(id,{id:user}),{status:403});
 await assert.rejects(f.service.publish(id,{id:'customer'},point),{status:403});
 await assert.rejects(f.service.stop(id,{id:'customer'}),{status:403});
});
test('GPS is isolated by both provider and order; stopped sharing hides the position',async()=>{
 const f=fixture();
 f.tables.provider_locations.push({...point,current_order_id:'other',provider_id:'provider',created_at:point.captured_at,is_online:true});
 f.tables.provider_locations.push({...point,current_order_id:id,provider_id:'other',created_at:point.captured_at,is_online:true});
 assert.equal((await f.service.read(id,{id:'customer'})).location,null);
 await f.service.publish(id,{id:'provider'},point); await f.service.stop(id,{id:'provider'});
 assert.equal((await f.service.read(id,{id:'customer'})).sharing,'off');
});
test('invalid, missing, stale and future GPS fixes are rejected without inserting',async()=>{
 const f=fixture();
 for(const change of [{latitude:91},{longitude:-181},{latitude:'16'},{accuracy:-1},{latitude:NaN},{captured_at:null},{captured_at:new Date(now-61000).toISOString()},{captured_at:new Date(now+16000).toISOString()}]) {
  await assert.rejects(f.service.publish(id,{id:'provider'},{...point,...change}),{status:400});
 }
 assert.equal(f.tables.provider_locations.length,0);
});
test('completed and cancelled orders reject sharing and hide historical GPS',async()=>{
 for(const status of ['completed','cancelled']) {
  const f=fixture(status);
  f.tables.provider_locations.push({...point,current_order_id:id,provider_id:'provider',created_at:point.captured_at,is_online:true});
  await assert.rejects(f.service.publish(id,{id:'provider'},point),{status:409});
  const result=await f.service.read(id,{id:'customer'}); assert.equal(result.location,null);assert.equal(result.events.length,1);
 }
});
test('an old location is explicitly marked stale and database errors do not look like an empty trip',async()=>{
 const f=fixture();
 f.tables.provider_locations.push({...point,current_order_id:id,provider_id:'provider',created_at:new Date(now-61000).toISOString(),is_online:true});
 assert.equal((await f.service.read(id,{id:'customer'})).sharing,'stale');
 f.breakDb();await assert.rejects(f.service.read(id,{id:'customer'}),{status:500});
});

test('repeated GPS updates replace the provider position and resume after stopping', async () => {
 const f=fixture();
 await f.service.publish(id,{id:'provider'},point);
 await f.service.publish(id,{id:'provider'},{...point,latitude:16.06});
 assert.equal(f.tables.provider_locations.length,1);
 assert.equal((await f.service.read(id,{id:'customer'})).location.latitude,16.06);
 await f.service.stop(id,{id:'provider'});
 await f.service.publish(id,{id:'provider'},{...point,latitude:16.07});
 const result=await f.service.read(id,{id:'customer'});
 assert.equal(result.sharing,'live');assert.equal(result.location.latitude,16.07);
 assert.equal(f.tables.provider_locations.length,1);
});
test('an existing provider position from another trip moves to the assigned trip',async()=>{
 const f=fixture();
 f.tables.provider_locations.push({...point,provider_id:'provider',current_order_id:'previous-trip',created_at:point.captured_at,is_online:false});
 await f.service.publish(id,{id:'provider'},point);
 assert.equal(f.tables.provider_locations.length,1);
 assert.equal(f.tables.provider_locations[0].current_order_id,id);
 assert.equal((await f.service.read(id,{id:'customer'})).sharing,'live');
});
