const test=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');const fs=require('node:fs');const vm=require('node:vm');const events=require('../src/services/tracking-events.service');
function fixture(denied=false) {
 const res=new EventEmitter();res.headers={};res.messages=[];res.set=v=>Object.assign(res.headers,v);res.flushHeaders=()=>{res.flushed=true;};res.write=v=>res.messages.push(v);res.end=()=>res.emit('close');
 const sandbox={module:{exports:{}},setInterval,clearInterval,setTimeout,clearTimeout,require(name){if(name==='./unused')return{};if(name.includes('supabase'))return {supabaseAdmin:{}};if(name.includes('tracking-events'))return events;return {createOrderTrackingService:()=>({read:async()=>{if(denied)throw Object.assign(new Error('denied'),{status:403});return{};},publish:async()=>({}),stop:async()=>({})})};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/controllers/order-tracking.controller'),'utf8'),sandbox);
 return {controller:sandbox.module.exports,res};
}
test('SSE authorizes access, disables buffering, isolates orders and cleans up on close',async()=>{
 const {controller,res}=fixture();await controller.stream({params:{id:'trip-a'},user:{id:'customer'}},res,e=>{throw e;});
 try{
 assert.equal(res.headers['X-Accel-Buffering'],'no');assert.equal(res.headers['Content-Type'],'text/event-stream');assert.equal(res.messages.length,1);
 events.changed('trip-b');assert.equal(res.messages.length,1);events.changed('trip-a');assert.equal(res.messages.length,2);
 }finally{res.end();}
 events.changed('trip-a');assert.equal(res.messages.length,2);
});
test('unauthorized viewers never open a stream',async()=>{
 const {controller,res}=fixture(true);let error;
 await controller.stream({params:{id:'trip-a'},user:{id:'stranger'}},res,e=>{error=e;});assert.equal(error.status,403);assert.equal(res.flushed,undefined);
});
test('successful GPS writes notify connected viewers',async()=>{
 const {controller,res}=fixture();res.json=()=>{};res.set=()=>{};
 let count=0;const off=events.subscribe('trip-a',()=>count++);
 try{await controller.publish({params:{id:'trip-a'},user:{id:'provider'},body:{}},res,e=>{throw e;});assert.equal(count,1);}finally{off();}
});
