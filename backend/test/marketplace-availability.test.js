const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMarketplaceAvailability } = require('../src/middleware/marketplace-availability.middleware');
function db(value, error = null) { return { from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: value === undefined ? null : { value }, error }; } }; } }; }
function response() { return { code: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
test('existing sites remain open when the setting does not exist', async () => {
 const gate=createMarketplaceAvailability(db(undefined)); let next=0;
 await gate.requireEnabled({}, response(), () => next++);assert.equal(next,1);
});
test('off blocks API access and reports the same public status without caching', async () => {
 for (const value of [false,'false',0,'0']) {
  const gate=createMarketplaceAvailability(db(value)); const res=response(); let next=0;
  await gate.requireEnabled({},res,()=>next++);assert.equal(res.code,503);assert.equal(res.body.code,'marketplace_disabled');assert.equal(next,0);
  const status=response();await gate.status({},status);assert.equal(status.body.data.enabled,false);assert.equal(status.headers['Cache-Control'],'no-store');
 }
});
test('on restores API access', async () => {
 const gate=createMarketplaceAvailability(db(true)); let next=0;
 await gate.requireEnabled({},response(),()=>next++);assert.equal(next,1);
});
test('database failures do not open a disabled feature', async () => {
 const gate=createMarketplaceAvailability(db(undefined,new Error('offline')));const res=response();
 await gate.requireEnabled({},res,()=>assert.fail('must not allow'));assert.equal(res.code,503);assert.equal(res.body.code,'marketplace_status_unavailable');
});
test('admin settings rejects non-booleans and surfaces failed database writes', async () => {
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');let writes=0;
 const sandbox={module:{exports:{}},console:{error(){}},require(name){if(name.endsWith('/supabase.service'))return {supabaseAdmin:{from(){return {async upsert(){writes++;return {error:new Error('write failed')};}}}}};return {};}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/admin.controller.js'),'utf8'),sandbox);
 const update=sandbox.module.exports.updatePlatformSettings;
 const invalid=response();await update({body:{marketplace_enabled:'false'},user:{id:'admin'}},invalid);assert.equal(invalid.code,400);assert.equal(writes,0);
 const failed=response();await update({body:{marketplace_enabled:false},user:{id:'admin'}},failed);assert.equal(failed.code,500);assert.equal(failed.body.success,false);
});
