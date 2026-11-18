import {test,before,beforeEach,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,writeBatch,arrayUnion} from 'firebase/firestore';
let env;
const now=()=>Date.now();
const groupData=()=>({name:'Test',ownerUid:'owner',memberUids:['owner','member'],memberNames:{owner:'Alice',member:'Bob'},inviteCode:'ABCDEFGH',inviteExpiresAt:now()+3600000,createdAt:now()});
const tripData=()=>({name:'Tokyo',status:'進行中',createdAt:now(),members:['Alice','Bob'],expenses:[]});
const expense=(id='E1')=>({id,date:'2026-11-18',amount:100,category:'FOOD',note:'Lunch',payer:'Alice',shares:{Alice:50,Bob:50}});
const db=uid=>env.authenticatedContext(uid).firestore();
const gref=d=>doc(d,'groups/G1'), tref=d=>doc(d,'groups/G1/trips/T1'), eref=(d,id='E1')=>doc(d,'groups/G1/trips/T1/expenses/'+id);
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-tallo-security',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),host:'127.0.0.1',port:8787}});});
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore(),g=groupData(),b=writeBatch(d);
  b.set(gref(d),g);b.set(doc(d,'invites/ABCDEFGH'),{groupId:'G1',ownerUid:'owner',expiresAt:g.inviteExpiresAt});
  b.set(tref(d),tripData());await b.commit();
 });
});
after(async()=>{await env?.cleanup();});
test('anonymous and nonmember cannot read a group',async()=>{
 await assertFails(getDoc(gref(env.unauthenticatedContext().firestore())));
 await assertFails(getDoc(gref(db('outsider'))));
 await assertSucceeds(getDoc(gref(db('member'))));
});
test('knowing group ID does not permit joining',async()=>{
 await assertFails(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider'),'memberNames.outsider':'Mallory'}));
});
test('wrong invite code cannot join',async()=>{
 await assertFails(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider'),'memberNames.outsider':'Mallory',joinCode:'WRONG123'}));
});
test('valid invite joins only self',async()=>{
 await assertSucceeds(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider'),'memberNames.outsider':'Mallory',joinCode:'ABCDEFGH'}));
 await assertSucceeds(getDoc(tref(db('outsider'))));
});
test('joining cannot alter existing names or add another UID',async()=>{
 await assertFails(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider'),'memberNames.outsider':'Mallory','memberNames.owner':'Fake',joinCode:'ABCDEFGH'}));
 await assertFails(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider','other'),'memberNames.outsider':'Mallory','memberNames.other':'X',joinCode:'ABCDEFGH'}));
});
test('expired invite denied',async()=>{
 await env.withSecurityRulesDisabled(c=>updateDoc(gref(c.firestore()),{inviteExpiresAt:1}));
 await assertFails(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider'),'memberNames.outsider':'M',joinCode:'ABCDEFGH'}));
});
test('member cannot seize ownership, edit names or rotate invites',async()=>{
 for(const patch of [{ownerUid:'member'},{'memberNames.owner':'Fake'},{inviteCode:'BCDEFGHJ',inviteExpiresAt:now()+10000}])
  await assertFails(updateDoc(gref(db('member')),patch));
});
test('forged invite denied',async()=>{
 await assertFails(setDoc(doc(db('outsider'),'invites/BCDEFGHJ'),{groupId:'G1',ownerUid:'outsider',expiresAt:now()+3600000}));
});
test('owner can rotate invite atomically; old code denied',async()=>{
 const d=db('owner'),b=writeBatch(d),expiresAt=now()+3600000;
 b.update(gref(d),{inviteCode:'BCDEFGHJ',inviteExpiresAt:expiresAt});
 b.set(doc(d,'invites/BCDEFGHJ'),{groupId:'G1',ownerUid:'owner',expiresAt});await assertSucceeds(b.commit());
 await assertFails(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider'),'memberNames.outsider':'M',joinCode:'ABCDEFGH'}));
 await assertSucceeds(updateDoc(gref(db('outsider')),{memberUids:arrayUnion('outsider'),'memberNames.outsider':'M',joinCode:'BCDEFGHJ'}));
});
test('owner creates group and invite in one batch',async()=>{
 const d=db('newowner'),b=writeBatch(d),expiresAt=now()+3600000;
 b.set(doc(d,'groups/G2'),{name:'New',ownerUid:'newowner',memberUids:['newowner'],memberNames:{newowner:'New'},inviteCode:'BCDEFGHJ',inviteExpiresAt:expiresAt,createdAt:now()});
 b.set(doc(d,'invites/BCDEFGHJ'),{groupId:'G2',ownerUid:'newowner',expiresAt});await assertSucceeds(b.commit());
});
test('valid expense allowed; nonmember denied',async()=>{
 await assertFails(setDoc(eref(db('outsider')),expense()));
 await assertSucceeds(setDoc(eref(db('member')),expense()));
});
test('maximum 20-way split stays within rules limits',async()=>{
 const members=Array.from({length:20},(_,i)=>'P'+i);
 await env.withSecurityRulesDisabled(c=>updateDoc(tref(c.firestore()),{members}));
 await assertSucceeds(setDoc(eref(db('member')),{...expense(),payer:'P0',shares:Object.fromEntries(members.map(name=>[name,5]))}));
});
for(const [label,patch] of [
 ['negative',{amount:-1}],['infinity',{amount:Infinity}],['unknown category',{category:'BAD'}],['unknown payer',{payer:'Mallory'}],
 ['wrong sum',{shares:{Alice:5}}],
 ['negative share',{shares:{Alice:-1,Bob:101}}],
 ['legacy participants field',{participants:[{name:'Alice',amount:50},{name:'Alice',amount:50}]}],
 ['unknown participant',{shares:{Mallory:100}}],['oversize note',{note:'X'.repeat(501)}],['extra field',{admin:true}]
]) test('invalid expense '+label+' denied',async()=>await assertFails(setDoc(eref(db('member')),{...expense(),...patch})));
test('legacy array cannot receive unvalidated expenses',async()=>{
 await assertFails(updateDoc(tref(db('member')),{expenses:arrayUnion(expense())}));
 await assertFails(updateDoc(tref(db('owner')),{expenses:arrayUnion(expense())}));
});
test('trip deletion and member closing denied',async()=>{
 await assertFails(deleteDoc(tref(db('owner'))));
 await assertFails(updateDoc(tref(db('member')),{status:'已結束'}));
 await assertSucceeds(updateDoc(tref(db('owner')),{status:'已結束'}));
 await assertFails(setDoc(eref(db('owner')),expense()));
});
test('member cannot rewrite or delete an expense; owner may delete',async()=>{
 await assertSucceeds(setDoc(eref(db('member')),expense()));
 await assertFails(updateDoc(eref(db('member')),{amount:1}));
 await assertFails(deleteDoc(eref(db('member'))));
 await assertSucceeds(deleteDoc(eref(db('owner'))));
});
test('legacy expense can only be removed by owner while active',async()=>{
 await env.withSecurityRulesDisabled(c=>updateDoc(tref(c.firestore()),{expenses:[expense()]}));
 await assertFails(updateDoc(tref(db('member')),{expenses:[]}));
 await assertSucceeds(updateDoc(tref(db('owner')),{expenses:[]}));
});
test('atomic owner import of ended trip with validated expense',async()=>{
 const d=db('owner'),b=writeBatch(d),t=doc(d,'groups/G1/trips/IMPORTED');
 b.set(t,{...tripData(),status:'已結束'});
 b.set(doc(d,'groups/G1/trips/IMPORTED/expenses/E1'),expense());await assertSucceeds(b.commit());
});

const personalEntry=()=>({id:'P1',date:'2026-11-19',type:'expense',amount:80,category:'food',note:'Coffee',account:'cash',split:null,createdAt:Date.now()});
test('private ledger: owner can create and read, anonymous and other users denied',async()=>{
 const p=d=>doc(d,'users/owner/entries/P1');
 await assertFails(setDoc(p(env.unauthenticatedContext().firestore()),personalEntry()));
 await assertFails(setDoc(p(db('outsider')),personalEntry()));
 await assertSucceeds(setDoc(p(db('owner')),personalEntry()));
 await assertSucceeds(getDoc(p(db('owner'))));await assertFails(getDoc(p(db('outsider'))));
});
test('private ledger: only own budget may be changed',async()=>{
 const p=d=>doc(d,'users/owner/settings/budget');
 await assertFails(setDoc(p(db('outsider')),{amount:100}));
 await assertSucceeds(setDoc(p(db('owner')),{amount:18000}));
 await assertSucceeds(updateDoc(p(db('owner')),{amount:20000}));
 await assertFails(getDoc(p(db('outsider'))));
 for(const amount of [0,-1,1.5,10000001])await assertFails(setDoc(p(db('owner')),{amount}));
 await assertFails(setDoc(p(db('owner')),{amount:10,public:true}));
});
for(const [label,patch] of [['decimal',{amount:1.5}],['negative',{amount:-1}],['extra field',{public:true}],['unknown account',{account:'shared'}],['forged split',{split:{count:3}}],['wrong id',{id:'P2'}],['long note',{note:'x'.repeat(121)}]])test('private ledger rejects '+label,async()=>await assertFails(setDoc(doc(db('owner'),'users/owner/entries/P1'),{...personalEntry(),...patch})));
test('private ledger income accepted and prior entries cannot be overwritten or deleted',async()=>{
 const p=doc(db('owner'),'users/owner/entries/P1');await assertSucceeds(setDoc(p,{...personalEntry(),type:'income'}));await assertFails(updateDoc(p,{amount:1}));await assertFails(deleteDoc(p));
});
