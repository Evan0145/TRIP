import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as model from '../daily-model.mjs';
const source=fs.readFileSync(new URL('../daily-app.mjs',import.meta.url),'utf8');
function runtime(){
 const root={innerHTML:''},scroller={scrollTop:0,scrollTo(){}},stage={style:{}},frame={style:{}};
 const globals={...model,Intl,Date,Map,Set,Number,String,Math,Array,Object,Error,crypto:webcrypto,innerWidth:1000,innerHeight:1000,setTimeout,clearTimeout,
 window:{addEventListener(){}},document:{addEventListener(){},getElementById:id=>id==='dailyApp'?root:id==='phoneScroll'?scroller:id==='phoneStage'?stage:null,querySelector:selector=>selector==='.phone-frame'?frame:null}};
 const imported=source.match(/import \{([^}]+)\}/)[1].split(',').map(x=>x.trim());
 for(const name of Object.keys(model))if(!imported.includes(name))delete globals[name];
 const body=source.replace(/import \{[^}]+\} from [^;]+;/,'').replace(/export function /g,'function ');
 const api=vm.runInNewContext(body+'\n({mountDaily,leaveDaily,getState:()=>state});',globals);
 return {api,root};
}
const snap=(data,id)=>({id,data:()=>data});
function adapter(){
 const callbacks=new Map();let active=0;
 const api={
 collection:(_db,...parts)=>({path:parts.join('/')}),doc:(_db,...parts)=>({path:parts.join('/')}),
 where:()=>({}),query:ref=>ref,
 onSnapshot:(ref,...args)=>{active++;const fn=args.find(x=>typeof x==='function');callbacks.set(ref.path,fn);
  if(ref.path==='users/owner/entries')fn({docs:[snap({date:'2026-11-19',type:'expense',amount:80,category:'food',note:'Coffee',account:'cash',createdAt:1},'P')]});
  if(ref.path==='users/owner/settings/budget')fn({exists:()=>true,data:()=>({amount:20000})});
  if(ref.path==='groups')fn({metadata:{hasPendingWrites:false},docs:[snap({name:'Dinner',memberUids:['owner'],memberNames:{owner:'A'}},'G')]});
  if(ref.path==='groups/G/trips')fn({metadata:{hasPendingWrites:false},docs:[snap({name:'Dinner',expenses:[]},'T')]});
  if(ref.path==='groups/G/trips/T/expenses')fn({docs:[snap({date:'2026-11-19',amount:100,category:'FOOD',note:'Lunch',payer:'A',shares:{A:50,B:50}},'E')]});
  return ()=>active--;
 },setDoc:async()=>{}
 };
 return {api,callbacks,active:()=>active};
}
test('production module mounts real subscriptions and combines only own shared share',()=>{
 const {api,root}=runtime(),fake=adapter();
 api.mountDaily({user:{uid:'owner',displayName:'A'},db:{},api:fake.api,goShared(){},logout(){}});
 const state=api.getState();
 assert.equal(state.budget,20000);assert.equal(model.summarize(state.records,'2026-11',20000).expense,130);
 assert.equal(state.sharedNet,50);assert(root.innerHTML.includes('Coffee'));assert(root.innerHTML.includes('Lunch'));
 assert(!state.records.some(x=>x.id==='r1'));
 api.leaveDaily();assert.equal(fake.active(),0);assert.equal(api.getState().records.length,0);
});
test('pending group snapshots do not subscribe protected children before commit',()=>{
 const {api}=runtime(),fake=adapter();
 api.mountDaily({user:{uid:'owner',displayName:'A'},db:{},api:fake.api,goShared(){},logout(){}});
 const before=fake.active();fake.callbacks.get('groups')({metadata:{hasPendingWrites:true},docs:[snap({memberNames:{owner:'A'}},'Uncommitted')]});
 assert.equal(fake.active(),before);assert(!fake.callbacks.has('groups/Uncommitted/trips'));api.leaveDaily();
});
