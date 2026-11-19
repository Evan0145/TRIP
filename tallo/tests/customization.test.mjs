
import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES,DEFAULT_ACCOUNTS,catalogItems,catalogItem,validateCatalogItem,checkCatalogChange,validateRecord,summarize} from '../daily-model.mjs';
const item={id:'c_11111111-1111-4111-8111-111111111111',label:'咖啡',icon:'☕',color:'#1F7A52',archived:false,updatedAt:1};
test('catalog merges preserve builtin IDs and independent defaults',()=>{
 const merged=catalogItems(CATEGORIES,[{...item,id:'food',label:'吃飯'},item]);
 assert.equal(merged.length,CATEGORIES.length+1);assert.equal(catalogItem(merged,'food').label,'吃飯');
 assert.equal(CATEGORIES[0].label,'餐飲');assert.equal(catalogItem(catalogItems(CATEGORIES),'food').label,'餐飲');
});
test('invalid catalog data cannot inject CSS or markup; missing references have safe fallback',()=>{
 for(const patch of [{color:'red;background:url(x)'},{icon:'<img>'},{label:''},{label:'x'.repeat(25)},{archived:'yes'},{updatedAt:NaN}])assert.throws(()=>validateCatalogItem({...item,...patch}));
 assert.equal(catalogItems(CATEGORIES,[{...item,color:'invalid'}]).length,CATEGORIES.length);
 assert.equal(catalogItem([],item.id).label,'未命名項目');
});
test('duplicates and last active item cannot be archived',()=>{
 assert.throws(()=>checkCatalogChange([item],{...item,archived:true}),/至少/);
 assert.throws(()=>checkCatalogChange([item],{...item,id:'different'}),/相同/);
 assert.equal(checkCatalogChange([item],{...item,label:'  早餐  '}).label,'早餐');
});
test('custom records require active known category and payment method; old amounts stay unchanged',()=>{
 const account={...item,id:'a_22222222-2222-4222-8222-222222222222',label:'電子支付'},record={type:'expense',date:'2026-11-19',amount:80,category:item.id,account:account.id,note:'',split:null};
 assert.equal(validateRecord(record,{categories:[item],accounts:[account]}),record);
 assert.throws(()=>validateRecord(record));
 assert.throws(()=>validateRecord(record,{categories:[{...item,archived:true}],accounts:[account]}));
 assert.throws(()=>validateRecord(record,{categories:[item],accounts:[{...account,archived:true}]}));
 assert.equal(summarize([record],'2026-11',100).expense,80);
 assert.equal(DEFAULT_ACCOUNTS.length,3);
});
