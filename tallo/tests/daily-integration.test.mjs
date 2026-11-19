import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as model from '../daily-model.mjs';
const source=fs.readFileSync(new URL('../daily-app.mjs',import.meta.url),'utf8');
function runtime(){
 const forms=new Map();const root={innerHTML:''},scroller={scrollTop:0,scrollTo(){}},stage={style:{}},frame={style:{}};
 const globals={...model,Intl,Date,Map,Set,Number,String,Math,Array,Object,Error,crypto:webcrypto,innerWidth:1000,innerHeight:1000,setTimeout,clearTimeout,
 FormData:class{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}},window:{addEventListener(){}},document:{addEventListener(){},getElementById:id=>id==='dailyApp'?root:id==='phoneScroll'?scroller:id==='phoneStage'?stage:forms.get(id)||null,querySelector:selector=>selector==='.phone-frame'?frame:null}};
 const imported=source.match(/import \{([^}]+)\}/)[1].split(',').map(x=>x.trim());
 for(const name of Object.keys(model))if(!imported.includes(name))delete globals[name];
 const body=source.replace(/import \{[^}]+\} from [^;]+;/,'').replace(/export function /g,'function ');
 const api=vm.runInNewContext(body+'\n({mountDaily,leaveDaily,getState:()=>state,navigate,startEntry,openItem,persistItem,persistEntry});',globals);
 return {api,root,forms};
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
  if(ref.path==='users/owner/categories'||ref.path==='users/owner/accounts')fn({docs:[]});
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

const customCategory={id:'c_11111111-1111-4111-8111-111111111111',label:'咖啡 & 點心',icon:'☕',color:'#A8823D',archived:false,updatedAt:1};
const customAccount={id:'a_22222222-2222-4222-8222-222222222222',label:'交通卡',icon:'🚃',color:'#1F7A52',archived:false,updatedAt:1};
test('custom catalogs drive quick entry, ledger and statistics; archived history remains counted',()=>{
 const {api,root}=runtime(),fake=adapter();
 api.mountDaily({user:{uid:'owner'},db:{},api:fake.api});
 fake.callbacks.get('users/owner/categories')({docs:[snap(customCategory,customCategory.id)]});
 fake.callbacks.get('users/owner/accounts')({docs:[snap(customAccount,customAccount.id)]});
 fake.callbacks.get('users/owner/entries')({docs:[snap({date:'2026-11-19',type:'expense',amount:90,category:customCategory.id,note:'',account:customAccount.id},'PC')]});
 api.startEntry(customCategory.id);assert(root.innerHTML.includes('咖啡 &amp; 點心'));assert(root.innerHTML.includes('交通卡'));
 api.getState().view='home';
 fake.callbacks.get('users/owner/categories')({docs:[snap({...customCategory,archived:true},customCategory.id)]});
 api.navigate('stats');assert(root.innerHTML.includes('咖啡 &amp; 點心'));assert(root.innerHTML.includes('90'));
 api.navigate('list');assert(root.innerHTML.includes('交通卡'));assert(root.innerHTML.includes('咖啡 &amp; 點心'));
 api.startEntry();assert(!root.innerHTML.includes('data-id="'+customCategory.id+'"'));
 api.leaveDaily();
});
test('adding a catalog item writes only to own UID, selects it in draft, and keeps existing draft values',async()=>{
 const {api,root,forms}=runtime(),fake=adapter(),writes=[];
 fake.api.setDoc=async(ref,data)=>writes.push({path:ref.path,data});
 api.mountDaily({user:{uid:'owner'},db:{},api:fake.api});
 api.startEntry();Object.assign(api.getState().draft,{amount:'88',date:'2026-11-17',note:'unsaved'});
 api.openItem('categories');const id=api.getState().editor.id;
 forms.set('itemForm',{values:{label:'咖啡',icon:'☕'}});
 await api.persistItem();assert.equal(writes[0].path,'users/owner/categories/'+id);
 assert.equal(api.getState().draft.category,id);assert.equal(api.getState().draft.amount,'88');assert.equal(api.getState().draft.date,'2026-11-17');assert.equal(api.getState().draft.note,'unsaved');
 assert(!Object.hasOwn(writes[0].data,'id'));await api.persistEntry();assert.equal(writes[1].data.category,id);
 api.leaveDaily();
});
test('catalog write failures keep editor and draft; account switch removes prior private customization',async()=>{
 const {api,forms}=runtime(),fake=adapter();fake.api.setDoc=async()=>{throw new Error('offline');};
 api.mountDaily({user:{uid:'owner'},db:{},api:fake.api});api.startEntry();
 api.openItem('accounts');forms.set('itemForm',{values:{label:'電子支付',icon:'📲'}});
 await assert.rejects(api.persistItem(),/offline/);assert.equal(api.getState().modal,'item');assert.equal(api.getState().editor.label,'電子支付');
 api.mountDaily({user:{uid:'other'},db:{},api:fake.api});assert.equal(api.getState().draft,null);assert.equal(api.getState().categoryItems.length,0);assert.equal(api.getState().accountItems.length,0);assert.equal(api.getState().editor,null);api.leaveDaily();
});
