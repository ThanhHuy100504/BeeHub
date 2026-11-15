const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const exported={};new Function('exports',ts.transpileModule(fs.readFileSync(require.resolve('../lib/goong-tracking-map.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exported);
const {gpsAccuracyArea}=exported;
test('GPS accuracy polygon keeps Goong longitude/latitude ordering, radius and a closed ring',()=>{
 const area=gpsAccuracyArea(108.2,16.05,25);const ring=area.geometry.coordinates[0];assert.deepEqual(ring[0],ring.at(-1));
 for(const [lng,lat] of ring){const toRad=n=>n*Math.PI/180;const dlat=toRad(lat-16.05),dlng=toRad(lng-108.2);const a=Math.sin(dlat/2)**2+Math.cos(toRad(lat))*Math.cos(toRad(16.05))*Math.sin(dlng/2)**2;const meters=6371008.8*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));assert.ok(Math.abs(meters-25)<0.01);}
});
test('zero accuracy and near-pole coordinates remain finite',()=>{
 for(const radius of [0,50000])for(const [lng,lat] of [[108,16],[179.99,89.99]]){
  const ring=gpsAccuracyArea(lng,lat,radius).geometry.coordinates[0];assert.ok(ring.every(p=>p.every(Number.isFinite)));assert.ok(ring.every(([x,y])=>Math.abs(x)<=180&&Math.abs(y)<=90));
 }
});
