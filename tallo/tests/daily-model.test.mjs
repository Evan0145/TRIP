import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,shares,validateRecord,parseAmount,splitHint,initialPreview,chartDays,sharedRecordRows} from '../daily-model.mjs';
const base={id:'t',date:'2026-11-19',type:'expense',amount:100,category:'food',account:'cash',note:'午餐',split:null};
test('personal expenses need no group or split',()=>assert.equal(validateRecord({...base}).split,null));
test('monthly totals separate income and count only own split',()=>{const s=summarize([base,{...base,amount:900,split:{count:3}},{...base,type:'income',amount:2000},{...base,date:'2026-10-19',amount:500}],'2026-11',1000);assert.equal(s.expense,400);assert.equal(s.income,2000);assert.equal(s.balance,1600);assert.equal(s.remaining,600);});
test('overspending stays visible and empty months are zero',()=>{assert.equal(summarize([base],'2026-11',50).remaining,-50);assert.equal(summarize([base],'2026-12',0).ratio,0);});
test('rounding keeps every cent when splitting uneven amounts',()=>{for(let count=2;count<=20;count++){const result=shares(100,count);assert.equal(result.reduce((s,v)=>s+Math.round(v*100),0),10000);assert(Math.max(...result)-Math.min(...result)<.011);}});
test('invalid money values are rejected',()=>{for(const amount of [0,-1,NaN,Infinity,1.5,10000001])assert.throws(()=>validateRecord({...base,amount}));});
test('invalid calendar dates are rejected and leap days work',()=>{for(const date of ['2026-02-29','2026-02-31','2026-13-01','invalid'])assert.throws(()=>validateRecord({...base,date}));assert.equal(validateRecord({...base,date:'2028-02-29'}).date,'2028-02-29');});
test('split requires expense and 2 to 20 people',()=>{for(const count of [1,21,2.5])assert.throws(()=>validateRecord({...base,split:{count}}));assert.throws(()=>validateRecord({...base,type:'income',split:{count:3}}));});
test('unknown accounts/categories and long notes are rejected',()=>{for(const patch of [{account:'unknown'},{category:'unknown'},{note:'x'.repeat(121)}])assert.throws(()=>validateRecord({...base,...patch}));});

test('money parser never silently rewrites decimals, negative values or scientific notation',()=>{for(const raw of ['12.5','-5','1e2','',' 80 ','1,000','10000001'])assert.throws(()=>parseAmount(raw));assert.equal(parseAmount('80'),80);});
test('split hint safely handles fractional, empty and invalid counts',()=>{for(const n of [2.5,0,1,21,NaN])assert.equal(splitHint(100,n),null);assert.deepEqual(splitHint(100,3),{own:33.34,receivable:66.66});});
test('reset returns independent full sample groups and records',()=>{const first=initialPreview('2026-11');first.groups.push({id:'test'});first.records.pop();const reset=initialPreview('2026-11');assert.equal(reset.groups.length,1);assert.equal(reset.records.length,15);assert.equal(summarize(reset.records,reset.month,reset.budget).expense,13754);});
test('chart covers every day including leap February and month end',()=>{assert.equal(chartDays('2026-11').length,30);assert.equal(chartDays('2026-12').at(-1),'31');assert.equal(chartDays('2028-02').length,29);assert.equal(chartDays('2026-02').length,28);});

test('shared ledger uses own shares, preserves legacy and avoids double counting',()=>{
 const trip={name:'Dinner',expenses:[{id:'E',date:'2026-11-19',amount:100,category:'FOOD',payer:'A',participants:[{name:'A',amount:50},{name:'B',amount:50}]}]};
 const docs=[{...trip.expenses[0],amount:120,shares:{A:60,B:60}}];
 const a=sharedRecordRows('G','T',trip,docs,'A'),b=sharedRecordRows('G','T',trip,docs,'B');
 assert.equal(a.length,1);assert.equal(a[0].amount,60);assert.equal(a[0].paid,120);assert.equal(b[0].paid,0);assert.equal(b[0].owed,60);
 assert.equal(summarize([...a,base],'2026-11',1000).expense,160);
});
