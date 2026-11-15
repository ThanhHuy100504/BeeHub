const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {WebSocket}=require('ws');const {once}=require('node:events');
const {attachTrackingWebSocket}=require('../src/services/tracking-websocket.service');
const events=require('../src/services/tracking-events.service');
async function fixture(){
 const server=http.createServer();let latitude=16;
 const close=attachTrackingWebSocket(server,{
  service:{read:async(id,user)=>{if(id!=='own' || user.id!=='owner')throw Object.assign(Error('Denied'),{status:403});return {location:{latitude},order_id:id};}},
  events,verifyToken:token=>{if(token!=='good')throw Error('Invalid');return {sub:'owner'};},
  db:{from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{role:'customer',status:'active'}})})},allowedOrigins:['https://app.test'],
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=`ws://127.0.0.1:${server.address().port}/api/orders/tracking/ws`;
 return {url,set:()=>{latitude=17;},close:async()=>{close();await new Promise(r=>server.close(r));}};
}
test('authenticated WebSocket pushes updated coordinates and isolates trip rooms',async()=>{
 const f=await fixture();const socket=new WebSocket(f.url,{origin:'https://app.test'});
 try{await once(socket,'open');let message=once(socket,'message');socket.send(JSON.stringify({type:'subscribe',token:'good',order_id:'own'}));
 assert.equal(JSON.parse((await message)[0]).data.location.latitude,16);
 f.set();message=once(socket,'message');events.changed('own');assert.equal(JSON.parse((await message)[0]).data.location.latitude,17);
 }finally{socket.terminate();await f.close();}
});
test('invalid tokens and unrelated trips receive no GPS data',async()=>{
 const f=await fixture();try{for(const [token,id] of [['bad','own'],['good','other']]){
 const socket=new WebSocket(f.url,{origin:'https://app.test'});await once(socket,'open');let messages=0;socket.on('message',()=>messages++);const closed=once(socket,'close');socket.send(JSON.stringify({type:'subscribe',token,order_id:id}));const [code]=await closed;assert.ok([4401,4403].includes(code));assert.equal(messages,0);
 }}finally{await f.close();}
});
test('untrusted browser origins cannot upgrade',async()=>{
 const f=await fixture();try{await new Promise((resolve,reject)=>{
 const socket=new WebSocket(f.url,{origin:'https://untrusted.test'});socket.on('error',e=>{assert.match(e.message,/403/);resolve();});socket.on('open',()=>{socket.terminate();reject(Error('Unexpected access'));});
 });}finally{await f.close();}
});
