import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createArrivalController} from '../arrival.mjs';
function fixture({reduced=false,hidden=false,inert=false}={}){
 const docEvents=new Map(),winEvents=new Map(),timers=new Map();let time=0,next=0,overlay,restored=0;
 const root={inert,innerHTML:'existing draft and account screen'};
 const button={focus(){doc.activeElement=button;}};
 const originalFocus={isConnected:true,focus(){restored++;doc.activeElement=originalFocus;}};
 const doc={visibilityState:hidden?'hidden':'visible',activeElement:originalFocus,
 getElementById:id=>id==='siteRoot'?root:null,
 createElement(){const classes=new Set();overlay={hidden:true,offsetWidth:100,events:new Map(),attributes:{},
 classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
 setAttribute(k,v){this.attributes[k]=v;},querySelector:()=>button,
 addEventListener(k,v){this.events.set(k,v);},removeEventListener(k){this.events.delete(k);},remove(){this.removed=true;}};return overlay;},
 body:{append(){}},addEventListener:(k,v)=>docEvents.set(k,v),removeEventListener:k=>docEvents.delete(k)};
 const win={matchMedia:()=>({matches:reduced}),addEventListener:(k,v)=>winEvents.set(k,v),removeEventListener:k=>winEvents.delete(k)};
 const controller=createArrivalController({doc,win,now:()=>time,setTimer:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;},clearTimer:id=>timers.delete(id)});
 const run=ms=>{const item=[...timers].find(([,v])=>v.ms===ms);assert(item,'missing timer '+ms);timers.delete(item[0]);item[1].fn();};
 return {controller,root,doc,docEvents,winEvents,timers,run,get overlay(){return overlay;},get restored(){return restored;},advance:ms=>time+=ms};
}
test('arrival runs before account screen and auto-releases focus and inert state',()=>{
 const f=fixture();f.controller.init();assert.equal(f.overlay.hidden,false);assert.equal(f.root.inert,true);
 assert.equal(f.overlay.attributes['aria-modal'],'true');f.run(3400);f.run(280);
 assert.equal(f.overlay.hidden,true);assert.equal(f.root.inert,false);assert.equal(f.restored,1);
 assert.equal(f.root.innerHTML,'existing draft and account screen');
});
test('skip and Escape close the scene without waiting or touching account data',()=>{
 const f=fixture();f.controller.init();f.overlay.events.get('click')({target:{closest:()=>({})}});f.run(280);assert.equal(f.overlay.hidden,true);
 f.controller.open();let prevented=false;f.docEvents.get('keydown')({key:'Escape',preventDefault(){prevented=true;}});f.run(280);
 assert(prevented);assert.equal(f.root.inert,false);assert.equal(f.timers.size,0);
});
test('reduced motion uses a short static entrance',()=>{
 const f=fixture({reduced:true});f.controller.init();assert(f.overlay.classList.contains('motion-reduced'));
 f.run(600);f.run(100);assert.equal(f.overlay.hidden,true);
});
test('initial background tab waits until it becomes visible',()=>{
 const f=fixture({hidden:true});f.controller.init();assert.equal(f.overlay.hidden,true);assert.equal(f.timers.size,0);
 f.doc.visibilityState='visible';f.docEvents.get('visibilitychange')();assert.equal(f.overlay.hidden,false);assert.equal(f.root.inert,true);
});
test('returning after a minute and restoring browser history replay the entrance',()=>{
 const f=fixture();f.controller.init();f.controller.close();f.run(280);
 f.doc.visibilityState='hidden';f.docEvents.get('visibilitychange')();f.advance(30000);f.doc.visibilityState='visible';f.docEvents.get('visibilitychange')();assert.equal(f.overlay.hidden,true);
 f.doc.visibilityState='hidden';f.docEvents.get('visibilitychange')();f.advance(60001);f.doc.visibilityState='visible';f.docEvents.get('visibilitychange')();assert.equal(f.overlay.hidden,false);
 f.controller.close();f.run(280);f.winEvents.get('pageshow')({persisted:true});assert.equal(f.overlay.hidden,false);
});
test('replay during closing and teardown restore preexisting inert state',()=>{
 const f=fixture({inert:true});f.controller.init();f.controller.close();f.controller.open();f.controller.close();f.run(280);assert.equal(f.root.inert,true);assert.equal(f.restored,1);
 f.controller.destroy();assert.equal(f.timers.size,0);assert.equal(f.docEvents.size,0);assert.equal(f.winEvents.size,0);assert(f.overlay.removed);
});
test('home-screen metadata references the generated square PNG and startup is not auth gated',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),manifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
 const png=fs.readFileSync(new URL('../assets/tallo-icon.png',import.meta.url));
 assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png.readUInt32BE(16),png.readUInt32BE(20));
 assert.equal(manifest.icons[0].sizes,png.readUInt32BE(16)+'x'+png.readUInt32BE(20));assert.equal(manifest.display,'standalone');
 assert(html.includes('rel="apple-touch-icon"'));assert(html.indexOf('initArrival();')<html.indexOf('const FB ='));
 const daily=fs.readFileSync(new URL('../daily-app.mjs',import.meta.url),'utf8');
 assert.equal((daily.match(/data-action="arrival"/g)||[]).length,2);assert(daily.includes('ctx.arrival?.()'));
});
